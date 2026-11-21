CREATE TABLE ci_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id bigint NOT NULL REFERENCES projects,
    workflow_run_id text NOT NULL,
    attempt integer NOT NULL CHECK (attempt > 0),
    job text NOT NULL,
    commit_sha text NOT NULL,
    started_at timestamptz(3),
    finished_at timestamptz(3) NOT NULL CHECK (started_at <= finished_at),
    artifact_url text NOT NULL,
    artifact_sha256 text NOT NULL,
    details jsonb NOT NULL,
    UNIQUE (repository_id, workflow_run_id, attempt, job)
);

CREATE INDEX ci_runs_project_finished_id ON ci_runs (repository_id, finished_at DESC, id DESC);
