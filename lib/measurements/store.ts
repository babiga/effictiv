import "server-only";

import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import type { z } from "zod";
import { database } from "./database";
import { toWh } from "./energy.mjs";
import { raplMetric, type uploadSchema } from "./schema.mjs";
import type { RunSummary } from "./types";
import { dashboardCachePolicy, saveWebDeliveryEstimate } from "./web-delivery-v1.mjs";

type RunUpload = z.infer<typeof uploadSchema>;

type Observation = {
  metric: string;
  subject: string;
  reading: number;
  unit: string;
  original_reading: number;
  original_unit: string;
};

function observations(result: RunUpload["result"]) {
  const rows: Observation[] = result.energy.readings.map(({ domain, value, unit }) => ({
    metric: raplMetric,
    subject: domain,
    reading: toWh(value, unit),
    unit: "Wh",
    original_reading: value,
    original_unit: unit,
  }));
  result.workload.visits.forEach((visit, index) => {
    if (visit.assertion !== "passed") return;
    const samples = [
      { metric: "time_to_usable", value: visit.timeToUsableMs, unit: "ms" },
      { metric: "time_to_assertion", value: visit.timeToAssertionMs, unit: "ms" },
      { metric: "transferred", value: visit.transferredBytes, unit: "B" },
    ];
    for (const { metric, value, unit } of samples) {
      rows.push({ metric, subject: String(index + 1), reading: value, unit, original_reading: value, original_unit: unit });
    }
  });
  return rows;
}

export async function insertRun(upload: RunUpload) {
  const client = await database().connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    const outcome = await insertRunInTransaction(client, upload);
    await client.query(outcome.status === "created" ? "COMMIT" : "ROLLBACK");
    return outcome;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function insertRunInTransaction(client: PoolClient, upload: RunUpload) {
  const { repositoryId, attempt, repetition, artifactUrl, result } = upload;
  const { collector, workload, sourceLog, energy } = result;
  const sourceRunId = result.sourceRunId ?? `sha256:${sourceLog.sha256}`;
  // Zod emits the fields in schema order so key order in the incoming JSON is immaterial.
  const payloadDigest = createHash("sha256").update(JSON.stringify(upload)).digest("hex");
  const identity = [repositoryId, collector.name, sourceRunId, attempt, result.scenario, repetition];
  const scenario = await client.query<{ id: string }>(`
    INSERT INTO scenarios (repository_id, scenario_key, revision, fixture_sha256, mock_data_sha256, functional_unit)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (repository_id, scenario_key, revision, fixture_sha256, mock_data_sha256)
    DO UPDATE SET functional_unit = EXCLUDED.functional_unit
    RETURNING id
  `, [repositoryId, result.scenario, workload.revision, workload.fixtureSha256, workload.mockDataSha256, result.functionalUnit]);

  const inserted = await client.query<{ id: string }>(`
    INSERT INTO runs (
      repository_id, collector, source_run_id, attempt, scenario_key, repetition,
      scenario_id, collector_version, collector_commit, commit_sha,
      started_at, finished_at, hardware, cache_policy, browser_version, viewport,
      completed_visits, failed_visits, assertion, energy_phase, energy_phase_duration_us,
      energy_coverage, energy_unavailable_reason, source_schema_version, source_url, source_sha256, payload_sha256
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
      $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
    )
    ON CONFLICT (repository_id, collector, source_run_id, attempt, scenario_key, repetition) DO NOTHING
    RETURNING id
  `, [
    ...identity, scenario.rows[0].id, collector.version, "commit" in collector ? collector.commit : null, result.commitSha,
    workload.startedAt, workload.finishedAt, result.hardware, workload.cachePolicy, workload.browserVersion, workload.viewport,
    workload.completedVisits, workload.failedVisits, result.assertion, energy.phase,
    energy.status === "available" ? energy.phaseDurationUs : null,
    energy.status === "available" ? energy.coverage : null,
    energy.status === "unavailable" ? energy.reason : null,
    result.schemaVersion, artifactUrl, sourceLog.sha256, payloadDigest,
  ]);

  if (!inserted.rows.length) {
    // A separate statement sees the committed row after a concurrent uploader wins the unique key.
    const original = await client.query<{ id: string; payload_sha256: string }>(`
      SELECT id, payload_sha256 FROM runs
      WHERE repository_id = $1 AND collector = $2 AND source_run_id = $3 AND attempt = $4
        AND scenario_key = $5 AND repetition = $6
    `, identity);
    const { id, payload_sha256 } = original.rows[0];
    return { id, status: payload_sha256 === payloadDigest ? "replayed" : "conflict" } as const;
  }

  const { id } = inserted.rows[0];
  const samples = observations(result);
  await client.query(`
    INSERT INTO observations (run_id, metric, subject, reading, unit, original_reading, original_unit)
    SELECT $1, metric, subject, reading, unit, original_reading, original_unit
    FROM jsonb_to_recordset($2::jsonb) AS rows(
      metric text, subject text, reading double precision, unit text,
      original_reading double precision, original_unit text
    )
  `, [id, JSON.stringify(samples)]);
  if (result.assertion === "passed" && workload.cachePolicy === dashboardCachePolicy) {
    const bytesPerVisit = samples.filter(({ metric }) => metric === "transferred").map(({ original_reading }) => original_reading);
    await saveWebDeliveryEstimate(client, id, bytesPerVisit);
  }
  return { id, status: "created" } as const;
}

export type RunFilters = { scenario?: string; search?: string };
export type RunCursor = { startedAt: string; id: string };

export async function listRuns(repositoryId: string, filters: RunFilters, cursor?: RunCursor, limit?: number) {
  const result = await database().query<Omit<RunSummary, "startedAt"> & { startedAt: Date }>(`
    SELECT r.id, r.scenario_key AS scenario, s.revision, r.commit_sha AS "commitSha",
      r.started_at AS "startedAt", r.collector, r.collector_version AS "collectorVersion",
      r.source_run_id AS "sourceRunId", r.source_url AS "sourceUrl", r.source_sha256 AS "sourceSha256",
      r.completed_visits AS "completedVisits", r.failed_visits AS "failedVisits", r.assertion,
      stats.energy_wh AS "energyWh",
      CASE WHEN r.assertion = 'passed' THEN stats.energy_wh / NULLIF(r.completed_visits, 0) END AS "energyWhPerVisit",
      r.energy_coverage AS "energyCoverage", r.energy_unavailable_reason AS "energyUnavailableReason",
      r.energy_phase AS "energyPhase", COALESCE(stats.energy_readings, '[]'::jsonb) AS "energyReadings",
      stats.mean_time_to_usable AS "meanTimeToUsableMs", stats.mean_transferred AS "meanTransferredBytes",
      CASE WHEN delivery.run_id IS NOT NULL THEN jsonb_build_object(
        'transferredBytes', delivery.transferred_bytes::text,
        'totalGramsCo2e', delivery.total_grams_co2e,
        'gramsCo2ePerVisit', delivery.total_grams_co2e / NULLIF(r.completed_visits, 0),
        'estimatorVersion', delivery.estimator_version,
        'modelVersion', delivery.model_version,
        'assumptions', delivery.assumptions
      ) END AS "webDeliveryEstimate"
    FROM runs r
    JOIN projects p ON p.repository_id = r.repository_id AND p.is_public
    JOIN scenarios s ON s.id = r.scenario_id
    LEFT JOIN web_delivery_estimates delivery ON delivery.run_id = r.id
    LEFT JOIN LATERAL (
      SELECT SUM(reading) FILTER (WHERE metric = $7) AS energy_wh,
        jsonb_agg(jsonb_build_object('domain', subject, 'value', original_reading, 'unit', original_unit)
          ORDER BY subject) FILTER (WHERE metric = $7) AS energy_readings,
        AVG(reading) FILTER (WHERE metric = 'time_to_usable') AS mean_time_to_usable,
        AVG(reading) FILTER (WHERE metric = 'transferred') AS mean_transferred
      FROM observations WHERE run_id = r.id
    ) stats ON true
    WHERE r.repository_id = $1 AND ($2::text IS NULL OR r.scenario_key = $2)
      AND ($3::text IS NULL OR strpos(lower(r.collector), lower($3)) > 0
        OR strpos(r.scenario_key, lower($3)) > 0 OR starts_with(r.commit_sha, lower($3)))
      AND ($4::timestamptz IS NULL OR (r.started_at, r.id) < ($4::timestamptz, $5::uuid))
    ORDER BY r.started_at DESC, r.id DESC
    LIMIT $6
  `, [repositoryId, filters.scenario ?? null, filters.search ?? null, cursor?.startedAt ?? null,
    cursor?.id ?? null, limit ?? null, raplMetric]);
  return result.rows.map((row) => ({ ...row, startedAt: row.startedAt.toISOString() }));
}
