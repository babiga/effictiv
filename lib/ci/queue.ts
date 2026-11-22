import "server-only";

import { githubJson, GitHubError, installationToken, repositorySchema } from "@/lib/github/client";
import { database } from "@/lib/measurements/database";
import { insertReport } from "@/lib/efficiency/store";
import { insertCiRun } from "@/lib/measurements/ci-store";
import { fetchCiArtifact, InvalidArtifact, MissingArtifact } from "./artifact";
import { supportedRun, workflowRunSchema } from "./workflow";

export type RunAttempt = { id: string; run_attempt: number };
type JobKey = { repositoryId: string; runId?: string; attempt?: number };
type Job = {
  repositoryId: string; runId: string; attempt: number; installationId: string; tries: number; lease: string;
};
const maxTries = 6;

export async function enqueueCiRuns(repositoryId: string, installationId: string, runs: RunAttempt[], manual = false) {
  if (!runs.length) return;
  await database().query(`
    INSERT INTO ci_import_jobs (repository_id, workflow_run_id, attempt, installation_id)
    SELECT p.repository_id, r.id, r.run_attempt, p.github_installation_id
    FROM projects p CROSS JOIN jsonb_to_recordset($3::jsonb) r(id text, run_attempt integer)
    WHERE p.repository_id = $1 AND p.github_installation_id = $2 AND NOT p.github_access_suspended
    ON CONFLICT (repository_id, workflow_run_id, attempt) DO UPDATE SET
      installation_id = EXCLUDED.installation_id, status = 'pending', due_at = now(),
      tries = CASE WHEN ci_import_jobs.status = 'pending' AND ci_import_jobs.installation_id = EXCLUDED.installation_id
        THEN ci_import_jobs.tries ELSE 0 END,
      lease = NULL, updated_at = now(), message = NULL
    WHERE ci_import_jobs.status <> 'imported' AND (
      ci_import_jobs.installation_id <> EXCLUDED.installation_id
      OR ($4 AND (ci_import_jobs.status IN ('skipped', 'failed')
        OR (ci_import_jobs.status = 'pending' AND ci_import_jobs.tries > 0)))
    )
  `, [repositoryId, installationId, JSON.stringify(runs.map(({ id, run_attempt }) => ({ id, run_attempt }))), manual]);
}

async function claimJob(key?: JobKey) {
  const { rows: [job] } = await database().query<Job>(`
    WITH due AS (
      SELECT j.repository_id, j.workflow_run_id, j.attempt
      FROM ci_import_jobs j JOIN projects p USING (repository_id)
      WHERE j.due_at <= now() AND j.status IN ('pending', 'running')
        AND p.github_installation_id = j.installation_id AND NOT p.github_access_suspended
        AND ($1::bigint IS NULL OR j.repository_id = $1)
        AND ($2::text IS NULL OR j.workflow_run_id = $2)
        AND ($3::int IS NULL OR j.attempt = $3)
      ORDER BY j.due_at, j.repository_id, j.workflow_run_id, j.attempt
      LIMIT 1 FOR UPDATE OF j SKIP LOCKED
    )
    UPDATE ci_import_jobs j SET status = 'running', tries = j.tries + 1, lease = gen_random_uuid(),
      due_at = now() + interval '2 minutes', updated_at = now()
    FROM due WHERE (j.repository_id, j.workflow_run_id, j.attempt) = (due.repository_id, due.workflow_run_id, due.attempt)
    RETURNING j.repository_id AS "repositoryId", j.workflow_run_id AS "runId", j.attempt,
      j.installation_id AS "installationId", j.tries, j.lease
  `, [key?.repositoryId ?? null, key?.runId ?? null, key?.attempt ?? null]);
  return job ?? null;
}

async function finishJob(job: Job, payload: Awaited<ReturnType<typeof fetchCiArtifact>>) {
  const client = await database().connect();
  try {
    await client.query("BEGIN");
    const active = await client.query(`
      SELECT 1 FROM projects
      WHERE repository_id = $1 AND github_installation_id = $2 AND NOT github_access_suspended FOR UPDATE
    `, [job.repositoryId, job.installationId]);
    const locked = await client.query(`
      SELECT 1 FROM ci_import_jobs WHERE lease = $1 AND status = 'running' FOR UPDATE
    `, [job.lease]);
    if (active.rowCount && locked.rowCount) {
      const outcome = payload.kind === "efficiency" ? await insertReport(payload.report, payload.source, client)
        : await insertCiRun(payload.artifact, payload.source, client);
      const conflict = outcome.status === "conflict";
      await client.query(`
        UPDATE ci_import_jobs SET status = $2, message = $3, updated_at = now(), lease = NULL WHERE lease = $1
      `, [job.lease, conflict ? "failed" : "imported", conflict ? "A different artifact already uses this run identity." : null]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function finishError(job: Job, error: unknown) {
  const artifactError = error instanceof InvalidArtifact || error instanceof MissingArtifact;
  const accessError = error instanceof GitHubError && [401, 403, 404, 410].includes(error.status) && !error.retryAt;
  const ignore = accessError || (error instanceof MissingArtifact && job.tries >= 3);
  const retry = job.tries < maxTries && !ignore && !(error instanceof InvalidArtifact);
  const start = error instanceof GitHubError && error.retryAt ? error.retryAt.getTime() : 0;
  const backoff = Date.now() + Math.min(10 * 60 * 2 ** (job.tries - 1), 6 * 60 * 60) * 1000;
  const message = artifactError ? error.message
    : accessError ? "GitHub can no longer provide this run for the repository."
    : retry ? "GitHub import is temporarily unavailable. A retry is queued."
    : "The run could not be imported. Use Sync now to retry.";
  if (!artifactError && !accessError) {
    console.error("CI import attempt failed", { repositoryId: job.repositoryId, runId: job.runId, attempt: job.attempt,
      status: error instanceof GitHubError ? error.status : undefined, error: error instanceof Error ? error.name : "unknown" });
  }
  await database().query(`
    UPDATE ci_import_jobs SET status = $2, message = $3, updated_at = now(), due_at = $4, lease = NULL
    WHERE lease = $1
  `, [job.lease, retry ? "pending" : ignore ? "skipped" : "failed", message, new Date(Math.max(backoff, start))]);
}

export async function processCiQueue(key?: JobKey, limit = 1) {
  const deadline = Date.now() + 25_000;
  for (let index = 0; index < limit && Date.now() < deadline; index++) {
    const job = await claimJob(key);
    if (!job) return;
    try {
      if (job.tries > maxTries) throw new Error("CI import lease expired after the final attempt");
      const token = await installationToken(job.installationId, job.repositoryId);
      const repository = await githubJson(`/repositories/${job.repositoryId}`, token, repositorySchema);
      const run = await githubJson(
        `/repos/${repository.full_name}/actions/runs/${job.runId}/attempts/${job.attempt}`, token, workflowRunSchema,
      );
      if (repository.id !== job.repositoryId || run.id !== job.runId || run.run_attempt !== job.attempt
        || !supportedRun(run, repository.id, repository.default_branch)) {
        throw new InvalidArtifact("The GitHub attempt does not match the Effictiv workflow on the default branch.");
      }
      const payload = await fetchCiArtifact(token, repository.full_name, repository.id, run);
      await finishJob(job, payload);
    } catch (error) {
      await finishError(job, error);
    }
  }
}

export async function ciSyncStatus(repositoryId: string) {
  const { rows: [row] } = await database().query<{ status: JobStatus; message: string | null; updatedAt: Date }>(`
    SELECT status, message, updated_at AS "updatedAt" FROM ci_import_jobs
    WHERE repository_id = $1
    ORDER BY (status IN ('running', 'pending')) DESC, updated_at DESC LIMIT 1
  `, [repositoryId]);
  return row ?? null;
}

type JobStatus = "pending" | "running" | "imported" | "skipped" | "failed";
