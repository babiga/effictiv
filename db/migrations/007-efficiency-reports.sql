CREATE TABLE efficiency_reports (
    repository_id bigint NOT NULL REFERENCES projects ON DELETE CASCADE,
    run_id bigint NOT NULL,
    attempt integer NOT NULL,
    head_sha text NOT NULL,
    base_sha text,
    artifact_url text NOT NULL,
    artifact_sha256 text NOT NULL,
    report jsonb NOT NULL,
    imported_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (repository_id, run_id, attempt)
);
