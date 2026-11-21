CREATE TABLE projects (
    repository_id bigint PRIMARY KEY,
    repository_name text NOT NULL,
    is_public boolean NOT NULL DEFAULT false
);

CREATE TABLE scenarios (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    repository_id bigint NOT NULL REFERENCES projects,
    scenario_key text NOT NULL,
    revision integer NOT NULL CHECK (revision > 0),
    fixture_sha256 text NOT NULL,
    mock_data_sha256 text NOT NULL,
    functional_unit text NOT NULL,
    UNIQUE (repository_id, scenario_key, revision, fixture_sha256, mock_data_sha256),
    UNIQUE (repository_id, scenario_key, id)
);

CREATE TABLE runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id bigint NOT NULL REFERENCES projects,
    scenario_key text NOT NULL,
    scenario_id bigint NOT NULL,
    collector text NOT NULL,
    collector_version text NOT NULL,
    collector_commit text,
    source_run_id text NOT NULL,
    attempt integer NOT NULL CHECK (attempt > 0),
    repetition integer NOT NULL CHECK (repetition > 0),
    commit_sha text NOT NULL,
    started_at timestamptz(3) NOT NULL,
    finished_at timestamptz(3) NOT NULL CHECK (finished_at >= started_at),
    hardware jsonb NOT NULL,
    cache_policy text NOT NULL,
    browser_version text NOT NULL,
    viewport jsonb NOT NULL,
    completed_visits integer NOT NULL CHECK (completed_visits >= 0),
    failed_visits integer NOT NULL CHECK (failed_visits >= 0),
    assertion text NOT NULL CHECK (assertion IN ('passed', 'failed')),
    energy_phase text NOT NULL,
    energy_phase_duration_us bigint,
    energy_coverage text,
    energy_unavailable_reason text,
    source_schema_version smallint NOT NULL,
    source_url text NOT NULL,
    source_sha256 text NOT NULL,
    payload_sha256 text NOT NULL,
    FOREIGN KEY (repository_id, scenario_key, scenario_id)
        REFERENCES scenarios (repository_id, scenario_key, id),
    UNIQUE (repository_id, collector, source_run_id, attempt, scenario_key, repetition),
    CHECK (assertion <> 'passed' OR (completed_visits > 0 AND failed_visits = 0))
);

CREATE INDEX runs_project_started_id ON runs (repository_id, started_at DESC, id DESC);

CREATE TABLE observations (
    run_id uuid NOT NULL REFERENCES runs ON DELETE CASCADE,
    metric text NOT NULL,
    subject text NOT NULL,
    reading double precision NOT NULL CHECK (reading >= 0),
    unit text NOT NULL,
    original_reading double precision NOT NULL CHECK (original_reading >= 0),
    original_unit text NOT NULL,
    PRIMARY KEY (run_id, metric, subject)
);

INSERT INTO projects (repository_id, repository_name, is_public)
VALUES (1306723014, 'babiga/effictiv', true);
