CREATE TABLE recommendations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id bigint NOT NULL REFERENCES projects,
    slug text NOT NULL,
    title text NOT NULL,
    hypothesis text NOT NULL,
    policy_version integer NOT NULL CHECK (policy_version > 0),
    landing_budget_ms integer NOT NULL CHECK (landing_budget_ms >= 0),
    scroll_budget_ms integer NOT NULL CHECK (scroll_budget_ms >= 0),
    UNIQUE (repository_id, slug)
);

CREATE TABLE recommendation_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recommendation_id uuid NOT NULL REFERENCES recommendations ON DELETE CASCADE,
    event_key text NOT NULL,
    kind text NOT NULL CHECK (kind IN ('implement', 'verify', 'dismiss')),
    status text NOT NULL CHECK (status IN ('implemented', 'verified', 'inconclusive', 'dismissed')),
    payload jsonb NOT NULL,
    landing_comparison_id uuid REFERENCES dashboard_comparisons,
    scroll_comparison_id uuid REFERENCES dashboard_comparisons,
    verification jsonb,
    created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (recommendation_id, event_key),
    CHECK (
        (kind = 'implement' AND status = 'implemented'
            AND landing_comparison_id IS NULL AND scroll_comparison_id IS NULL AND verification IS NULL)
        OR (kind = 'verify' AND status IN ('verified', 'inconclusive')
            AND landing_comparison_id IS NOT NULL AND scroll_comparison_id IS NOT NULL AND verification IS NOT NULL)
        OR (kind = 'dismiss' AND status = 'dismissed'
            AND landing_comparison_id IS NULL AND scroll_comparison_id IS NULL AND verification IS NULL)
    )
);

CREATE INDEX recommendation_events_history ON recommendation_events (recommendation_id, id DESC);

INSERT INTO recommendations (repository_id, slug, title, hypothesis, policy_version, landing_budget_ms, scroll_budget_ms)
VALUES (
    1306723014,
    'defer-service-energy-profile',
    'Defer the Service Energy Profile chart',
    'Mounting the lower radar chart when it first enters the viewport may reduce CPU package energy on landing while preserving the scroll experience.',
    1,
    100,
    200
);
