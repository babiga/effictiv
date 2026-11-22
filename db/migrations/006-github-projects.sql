CREATE TABLE accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id bigint NOT NULL UNIQUE,
    login text NOT NULL,
    name text NOT NULL,
    avatar_url text,
    github_access_token text NOT NULL,
    github_refresh_token text,
    github_token_expires_at timestamptz
);

CREATE TABLE account_sessions (
    token_hash text PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES accounts ON DELETE CASCADE,
    expires_at timestamptz NOT NULL
);
CREATE INDEX account_sessions_expiry ON account_sessions (expires_at);

ALTER TABLE projects ADD COLUMN github_installation_id bigint;
ALTER TABLE projects ADD COLUMN github_private boolean;
ALTER TABLE projects ADD COLUMN github_default_branch text;
ALTER TABLE projects ADD COLUMN github_access_suspended boolean NOT NULL DEFAULT false;
CREATE INDEX projects_github_installation ON projects (github_installation_id) WHERE github_installation_id IS NOT NULL;

CREATE TABLE account_projects (
    account_id uuid NOT NULL REFERENCES accounts ON DELETE CASCADE,
    repository_id bigint NOT NULL REFERENCES projects ON DELETE CASCADE,
    imported_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, repository_id)
);

ALTER TABLE ci_runs ADD COLUMN github_artifact_id bigint;
ALTER TABLE ci_runs ADD COLUMN artifact_json text;

CREATE TABLE ci_import_jobs (
    repository_id bigint NOT NULL REFERENCES projects ON DELETE CASCADE,
    workflow_run_id text NOT NULL,
    attempt integer NOT NULL CHECK (attempt > 0),
    installation_id bigint NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'imported', 'skipped', 'failed'
    )),
    tries integer NOT NULL DEFAULT 0,
    due_at timestamptz NOT NULL DEFAULT now(),
    lease uuid,
    updated_at timestamptz NOT NULL DEFAULT now(),
    message text,
    PRIMARY KEY (repository_id, workflow_run_id, attempt)
);
CREATE INDEX ci_import_jobs_due ON ci_import_jobs (due_at) WHERE status IN ('pending', 'running');
