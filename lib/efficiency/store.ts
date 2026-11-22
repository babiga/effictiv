import "server-only";
import type { PoolClient } from "pg";
import { z } from "zod";
import { projectScore, reportSchema } from "@/collector/model.mjs";
import { database } from "@/lib/measurements/database";

export type EfficiencyReport = z.output<typeof reportSchema>;
type Source = { artifactUrl: string; artifactSha256: string };
export async function insertReport(report: EfficiencyReport, source: Source, client: PoolClient) {
  const { rows } = await client.query(
    `
    INSERT INTO efficiency_reports (repository_id,run_id,attempt,head_sha,base_sha,artifact_url,artifact_sha256,report)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (repository_id,run_id,attempt) DO UPDATE SET artifact_sha256=EXCLUDED.artifact_sha256
    WHERE efficiency_reports.artifact_sha256=EXCLUDED.artifact_sha256 RETURNING run_id
  `,
    [
      report.repositoryId,
      report.runId,
      report.attempt,
      report.commitSha,
      report.baseSha,
      source.artifactUrl,
      source.artifactSha256,
      report,
    ],
  );
  return { status: rows.length ? "imported" : "conflict" };
}
export async function reportHistory(repositoryId: string) {
  const { rows } = await database().query<{
    runId: string;
    attempt: number;
    commit: string;
    base: string | null;
  }>(
    `
    SELECT run_id::text AS "runId", attempt, head_sha AS commit, base_sha AS base
    FROM efficiency_reports WHERE repository_id=$1 ORDER BY run_id DESC, attempt DESC LIMIT 50
  `,
    [repositoryId],
  );
  return rows;
}
export async function readReport(repositoryId: string, runId: string, attempt: number) {
  const { rows } = await database().query<{ report: EfficiencyReport; url: string }>(
    `
    SELECT report, artifact_url AS url FROM efficiency_reports WHERE repository_id=$1 AND run_id=$2 AND attempt=$3
  `,
    [repositoryId, runId, attempt],
  );
  return rows[0] ?? null;
}

export async function scoreHistory(report: EfficiencyReport) {
  if (!report.configHash) return [];
  const { rows } = await database().query<{
    runId: string;
    attempt: number;
    commit: string;
    workloads: EfficiencyReport["workloads"];
    setupError: string | null;
  }>(
    `
    SELECT run_id::text AS "runId", attempt, head_sha AS commit, report->'workloads' AS workloads,
      report->>'setupError' AS "setupError"
    FROM efficiency_reports
    WHERE repository_id=$1 AND (run_id, attempt)<=($2::bigint, $3::integer)
      AND report->>'configHash'=$4 AND report->>'runner'=$5
    ORDER BY run_id DESC, attempt DESC LIMIT 8
  `,
    [report.repositoryId, report.runId, report.attempt, report.configHash, report.runner],
  );
  return rows
    .reverse()
    .map((r) => ({ runId: r.runId, attempt: r.attempt, commit: r.commit, score: projectScore(r).score }));
}
