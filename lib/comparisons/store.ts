import "server-only";

import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import type { z } from "zod";
import { database } from "@/lib/measurements/database";
import { raplMetric } from "@/lib/measurements/schema.mjs";
import { insertRunInTransaction } from "@/lib/measurements/store";
import { evaluateComparison, policyVersion } from "./policy.mjs";
import type { comparisonUploadSchema } from "./schema.mjs";
import type { Comparison, ComparisonDetail, EvidencePair } from "./types";

type Upload = z.infer<typeof comparisonUploadSchema>;
type ScenarioUpload = Upload["scenarios"][number];
type Capture = ScenarioUpload["comparison"][number]["baseline"];
type ComparisonRow = Omit<Comparison, "createdAt"> & { createdAt: Date };

const columns = `
  c.id, c.scenario_key AS scenario, c.baseline_sha AS "baselineSha", c.candidate_sha AS "candidateSha",
  c.workflow_run_id AS "workflowRunId", c.attempt, c.pull_request AS "pullRequest", c.runner_id AS "runnerId",
  c.policy_version AS "policyVersion", c.verdict, c.reason, c.metrics, c.pair_count AS "pairCount",
  c.calibration_pair_count AS "calibrationPairCount", c.created_at AS "createdAt"
`;

class EvidenceConflict extends Error {}

async function saveCapture(client: PoolClient, upload: Upload, capture: Capture, ordinal: number) {
  if (!capture) return null;
  const { result, log } = capture;
  const digest = result.sourceLog.sha256;
  await client.query(`
    INSERT INTO dashboard_comparison_artifacts (repository_id, digest, log)
    VALUES ($1, $2, $3) ON CONFLICT DO NOTHING
  `, [upload.repositoryId, digest, log]);
  const artifactUrl = `/api/v1/projects/${upload.repositoryId}/comparison-artifacts/${digest}`;
  const run = await insertRunInTransaction(client, {
    repositoryId: upload.repositoryId, attempt: upload.attempt, repetition: ordinal, artifactUrl, result,
  });
  if (run.status === "conflict") throw new EvidenceConflict();
  return run.id;
}

export async function publishComparisons(upload: Upload) {
  const scenarios = [...upload.scenarios].sort((left, right) => left.scenario.localeCompare(right.scenario));
  const payloadDigest = createHash("sha256").update(JSON.stringify({ ...upload, scenarios })).digest("hex");
  const client = await database().connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    const comparisons = [];
    let created = false;
    for (const entry of scenarios) {
      const eligibility = evaluateComparison(entry.calibration, entry.comparison);
      const identity = [upload.repositoryId, upload.workflowRunId, upload.attempt, entry.scenario];
      const inserted = await client.query<{ id: string }>(`
        INSERT INTO dashboard_comparisons (
          repository_id, workflow_run_id, attempt, scenario_key, pull_request, baseline_sha, candidate_sha,
          runner_id, policy_version, verdict, reason, pair_count, calibration_pair_count, metrics, payload_sha256
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (repository_id, workflow_run_id, attempt, scenario_key) DO NOTHING RETURNING id
      `, [
        ...identity, upload.pullRequest, upload.baselineSha, upload.candidateSha, upload.runnerId,
        policyVersion, eligibility.verdict, eligibility.reason, eligibility.pairCount, eligibility.calibrationPairCount,
        eligibility.metrics, payloadDigest,
      ]);

      if (!inserted.rows.length) {
        const { rows: [existing] } = await client.query<{ id: string; digest: string; verdict: Comparison["verdict"] }>(`
          SELECT id, payload_sha256 AS digest, verdict FROM dashboard_comparisons
          WHERE repository_id = $1 AND workflow_run_id = $2 AND attempt = $3 AND scenario_key = $4
        `, identity);
        if (existing.digest !== payloadDigest) throw new EvidenceConflict();
        comparisons.push({ id: existing.id, scenario: entry.scenario, verdict: existing.verdict });
        continue;
      }

      created = true;
      const { id } = inserted.rows[0];
      for (const kind of ["calibration", "comparison"] as const) {
        for (const [index, pair] of entry[kind].entries()) {
          const ordinal = index + 1;
          const baseline = await saveCapture(client, upload, pair.baseline, ordinal);
          const candidate = await saveCapture(client, upload, pair.candidate, ordinal);
          await client.query(`
            INSERT INTO dashboard_comparison_pairs (comparison_id, kind, ordinal, baseline_run_id, candidate_run_id)
            VALUES ($1, $2, $3, $4, $5)
          `, [id, kind, ordinal, baseline, candidate]);
        }
      }
      comparisons.push({ id, scenario: entry.scenario, verdict: eligibility.verdict });
    }
    await client.query("COMMIT");
    return { status: created ? "created" : "replayed", comparisons } as const;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof EvidenceConflict) return { status: "conflict" } as const;
    throw error;
  } finally {
    client.release();
  }
}

function toComparison(row: ComparisonRow): Comparison {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

export async function listComparisons(repositoryId: string, cursor: string | null, limit: number) {
  const { rows } = await database().query<ComparisonRow>(`
    SELECT ${columns}
    FROM dashboard_comparisons c
    JOIN projects p ON p.repository_id = c.repository_id AND p.is_public
    WHERE c.repository_id = $1 AND ($2::uuid IS NULL OR (c.created_at, c.id) < (
      SELECT previous.created_at, previous.id FROM dashboard_comparisons previous
      WHERE previous.repository_id = $1 AND previous.id = $2
    ))
    ORDER BY c.created_at DESC, c.id DESC LIMIT $3
  `, [repositoryId, cursor, limit]);
  return rows.map(toComparison);
}

export async function getComparison(repositoryId: string, id: string): Promise<ComparisonDetail | null> {
  const { rows: [comparison] } = await database().query<ComparisonRow>(`
    SELECT ${columns}
    FROM dashboard_comparisons c
    JOIN projects p ON p.repository_id = c.repository_id AND p.is_public
    WHERE c.repository_id = $1 AND c.id = $2
  `, [repositoryId, id]);
  if (!comparison) return null;

  const { rows: pairs } = await database().query<EvidencePair>(`
    SELECT pair.kind, pair.ordinal, evidence.baseline, evidence.candidate
    FROM dashboard_comparison_pairs pair
    LEFT JOIN LATERAL (
      SELECT jsonb_object_agg(side, run) FILTER (WHERE run IS NOT NULL)->'baseline' AS baseline,
             jsonb_object_agg(side, run) FILTER (WHERE run IS NOT NULL)->'candidate' AS candidate
      FROM (
        SELECT slot.side, jsonb_build_object(
          'id', r.id, 'sourceUrl', r.source_url, 'completedVisits', r.completed_visits, 'failedVisits', r.failed_visits,
          'energyWhPerVisit', CASE WHEN r.assertion = 'passed' THEN (
            SELECT SUM(reading) FROM observations WHERE run_id = r.id AND metric = $2
          ) / NULLIF(r.completed_visits, 0) END
        ) AS run
        FROM (VALUES ('baseline', pair.baseline_run_id), ('candidate', pair.candidate_run_id)) AS slot(side, id)
        JOIN runs r ON r.id = slot.id
      ) AS runs
    ) evidence ON true
    WHERE pair.comparison_id = $1
    ORDER BY pair.kind DESC, pair.ordinal
  `, [id, raplMetric]);
  return { ...toComparison(comparison), pairs };
}

export async function getComparisonArtifact(repositoryId: string, digest: string) {
  const { rows: [artifact] } = await database().query<{ log: string }>(`
    SELECT a.log FROM dashboard_comparison_artifacts a
    JOIN projects p ON p.repository_id = a.repository_id AND p.is_public
    WHERE a.repository_id = $1 AND a.digest = $2
  `, [repositoryId, digest]);
  return artifact?.log ?? null;
}
