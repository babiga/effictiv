CREATE TABLE dashboard_comparisons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id bigint NOT NULL REFERENCES projects,
    workflow_run_id bigint NOT NULL,
    attempt integer NOT NULL CHECK (attempt > 0),
    pull_request integer NOT NULL CHECK (pull_request > 0),
    scenario_key text NOT NULL CHECK (scenario_key IN ('dashboard-landing', 'dashboard-scroll')),
    baseline_sha text NOT NULL,
    candidate_sha text NOT NULL,
    runner_id text NOT NULL,
    policy_version integer NOT NULL,
    verdict text NOT NULL CHECK (verdict IN ('improved', 'regressed', 'inconclusive', 'ineligible')),
    reason text NOT NULL,
    pair_count integer NOT NULL,
    calibration_pair_count integer NOT NULL,
    metrics jsonb,
    payload_sha256 text NOT NULL,
    created_at timestamptz(3) NOT NULL DEFAULT now(),
    UNIQUE (repository_id, workflow_run_id, attempt, scenario_key)
);

CREATE INDEX dashboard_comparisons_project_created_id ON dashboard_comparisons
    (repository_id, created_at DESC, id DESC);

CREATE TABLE dashboard_comparison_pairs (
    comparison_id uuid NOT NULL REFERENCES dashboard_comparisons ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('calibration', 'comparison')),
    ordinal integer NOT NULL CHECK (ordinal > 0),
    baseline_run_id uuid REFERENCES runs,
    candidate_run_id uuid REFERENCES runs,
    PRIMARY KEY (comparison_id, kind, ordinal)
);

CREATE TABLE dashboard_comparison_artifacts (
    repository_id bigint NOT NULL REFERENCES projects,
    digest text NOT NULL,
    log text NOT NULL,
    PRIMARY KEY (repository_id, digest)
);
