import "server-only";

import type { z } from "zod";
import type { CiRunSummary } from "./ci-types";
import { database } from "./database";
import { summarizeEcoCiArtifact, type ecoCiArtifactSchema } from "./eco-ci-schema.mjs";

type ArtifactSource = { artifactUrl: string; artifactSha256: string };
type Cursor = { finishedAt: string; id: string };

export async function insertCiRun(artifact: z.output<typeof ecoCiArtifactSchema>, source: ArtifactSource) {
  const { repositoryId, runId, attempt, job, commitSha, startedAt, finishedAt } = artifact;
  const identity = [repositoryId, runId, attempt, job];
  const db = database();
  const inserted = await db.query<{ id: string }>(`
    INSERT INTO ci_runs (
      repository_id, workflow_run_id, attempt, job, commit_sha, started_at, finished_at,
      artifact_url, artifact_sha256, details
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (repository_id, workflow_run_id, attempt, job) DO NOTHING
    RETURNING id
  `, [...identity, commitSha, startedAt, finishedAt, source.artifactUrl, source.artifactSha256, summarizeEcoCiArtifact(artifact)]);
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

export async function listCiRuns(repositoryId: string, search?: string, cursor?: Cursor, limit?: number) {
  const { rows } = await database().query<CiRunRow>(`
    SELECT r.id, r.workflow_run_id AS "runId", r.attempt, r.job, r.commit_sha AS "commitSha",
      r.started_at AS "startedAt", r.finished_at AS "finishedAt", r.artifact_url AS "artifactUrl",
      r.artifact_sha256 AS "artifactSha256", r.details
    FROM ci_runs r
    JOIN projects p ON p.repository_id = r.repository_id AND p.is_public
    WHERE r.repository_id = $1 AND ($2::text IS NULL OR starts_with(r.commit_sha, lower($2)))
      AND ($3::timestamptz IS NULL OR (r.finished_at, r.id) < ($3::timestamptz, $4::uuid))
    ORDER BY r.finished_at DESC, r.id DESC
    LIMIT $5
  `, [repositoryId, search ?? null, cursor?.finishedAt ?? null, cursor?.id ?? null, limit ?? null]);
  return rows.map(({ details, startedAt, finishedAt, ...run }) => ({
    ...run, ...details, startedAt: startedAt?.toISOString() ?? null, finishedAt: finishedAt.toISOString(),
  }));
}
