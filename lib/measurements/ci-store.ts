import "server-only";

import type { PoolClient } from "pg";
import type { z } from "zod";
import type { CiRunSummary } from "./ci-types";
import { database } from "./database";
import { summarizeEcoCiArtifact, type ecoCiArtifactSchema } from "./eco-ci-schema.mjs";

type ArtifactSource = { artifactUrl: string; artifactSha256: string } & (
  { githubArtifactId: string; rawArtifact: string } | { githubArtifactId?: never; rawArtifact?: never }
);
type Cursor = { finishedAt: string; id: string };

export async function insertCiRun(
  artifact: z.output<typeof ecoCiArtifactSchema>, source: ArtifactSource, db: PoolClient | ReturnType<typeof database> = database(),
) {
  const { repositoryId, runId, attempt, job, commitSha, startedAt, finishedAt } = artifact;
  const identity = [repositoryId, runId, attempt, job];
  const inserted = await db.query<{ id: string }>(`
    INSERT INTO ci_runs (
      repository_id, workflow_run_id, attempt, job, commit_sha, started_at, finished_at,
      artifact_url, artifact_sha256, details, github_artifact_id, artifact_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (repository_id, workflow_run_id, attempt, job) DO NOTHING
    RETURNING id
  `, [...identity, commitSha, startedAt, finishedAt, source.artifactUrl, source.artifactSha256,
    summarizeEcoCiArtifact(artifact), source.githubArtifactId ?? null, source.rawArtifact ?? null]);
  if (inserted.rows.length) return { id: inserted.rows[0].id, status: "created" } as const;

  const { rows: [{ id, artifact_sha256 }] } = await db.query<{ id: string; artifact_sha256: string }>(`
    SELECT id, artifact_sha256 FROM ci_runs
    WHERE repository_id = $1 AND workflow_run_id = $2 AND attempt = $3 AND job = $4
  `, identity);
  return { id, status: artifact_sha256 === source.artifactSha256 ? "replayed" : "conflict" } as const;
}

type Details = ReturnType<typeof summarizeEcoCiArtifact>;
type CiRunRow = Omit<CiRunSummary, keyof Details | "startedAt" | "finishedAt"> & {
  details: Details;
  startedAt: Date | null;
  finishedAt: Date;
};

export async function listCiRuns(
  repositoryId: string, search?: string, cursor?: Cursor, limit?: number, scope: "pilot" | "project" = "pilot",
) {
  const { rows } = await database().query<CiRunRow>(`
    SELECT r.id, r.workflow_run_id AS "runId", r.attempt, r.job, r.commit_sha AS "commitSha",
      r.started_at AS "startedAt", r.finished_at AS "finishedAt", r.artifact_url AS "artifactUrl",
      r.artifact_sha256 AS "artifactSha256", r.details, (r.artifact_json IS NOT NULL) AS "hasStoredArtifact"
    FROM ci_runs r JOIN projects p USING (repository_id)
    WHERE r.repository_id = $1 AND ($2::text IS NULL OR starts_with(r.commit_sha, lower($2)))
      AND ($3::timestamptz IS NULL OR (r.finished_at, r.id) < ($3::timestamptz, $4::uuid))
      AND ($6 = 'project' AND NOT p.github_access_suspended OR $6 = 'pilot' AND p.is_public AND r.github_artifact_id IS NULL)
    ORDER BY r.finished_at DESC, r.id DESC
    LIMIT $5
  `, [repositoryId, search ?? null, cursor?.finishedAt ?? null, cursor?.id ?? null, limit ?? null, scope]);
  return rows.map(({ details, startedAt, finishedAt, ...run }) => ({
    ...run, ...details, startedAt: startedAt?.toISOString() ?? null, finishedAt: finishedAt.toISOString(),
  }));
}

export async function ciSummary(repositoryId: string) {
  const { rows: [summary] } = await database().query<{
    runs: number; measuredRuns: number; totalJobWh: number | null; averageBuildWh: number | null;
  }>(`
    SELECT count(*)::int AS runs,
      count(r.details->>'jobWh')::int AS "measuredRuns",
      sum((r.details->>'jobWh')::double precision) AS "totalJobWh",
      avg((r.details->>'buildWh')::double precision)
        FILTER (WHERE r.details->>'buildOutcome' = 'success') AS "averageBuildWh"
    FROM ci_runs r JOIN projects p USING (repository_id)
    WHERE r.repository_id = $1 AND NOT p.github_access_suspended
  `, [repositoryId]);
  return summary;
}

export async function storedCiArtifact(repositoryId: string, runId: string) {
  const { rows: [row] } = await database().query<{ artifact: string }>(`
    SELECT r.artifact_json AS artifact FROM ci_runs r JOIN projects p USING (repository_id)
    WHERE r.repository_id = $1 AND r.id = $2 AND NOT p.github_access_suspended AND r.artifact_json IS NOT NULL
  `, [repositoryId, runId]);
  return row?.artifact ?? null;
}
