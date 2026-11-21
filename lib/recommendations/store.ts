import "server-only";

import type { PoolClient } from "pg";
import type { z } from "zod";
import type { Comparison } from "@/lib/comparisons/types";
import { database } from "@/lib/measurements/database";
import { evaluateVerification, verificationPolicyVersion } from "./policy.mjs";
import type { recommendationEventSchema } from "./schema.mjs";
import type { Implementation, Recommendation, RecommendationEvent, ScenarioBudgets, Verification } from "./types";

type EventInput = z.infer<typeof recommendationEventSchema>;
type EventRow = Omit<RecommendationEvent, "createdAt"> & { createdAt: Date };
type Registration = Implementation & { registeredAt: Date };
type RecommendationRow = Pick<Recommendation, "slug" | "title" | "hypothesis" | "policyVersion" | "budgets">;
type VerificationComparison = Pick<Comparison, "id" | "scenario" | "verdict" | "reason" | "metrics" |
  "workflowRunId" | "attempt" | "pullRequest" | "runnerId" | "baselineSha" | "candidateSha" | "policyVersion"> & {
  createdAt: Date;
  captureStartedAt: Date | null;
  baselineSamples: number[];
  candidateSamples: number[];
};

const eventColumns = `id::text, kind, status, verification, created_at AS "createdAt"`;
const budgetColumns = `policy_version AS "policyVersion",
  jsonb_build_object('dashboard-landing', landing_budget_ms, 'dashboard-scroll', scroll_budget_ms) AS budgets`;

class RecommendationConflict extends Error {}

function toEvent({ id, kind, status, verification, createdAt }: EventRow): RecommendationEvent {
  return { id, kind, status, verification, createdAt: createdAt.toISOString() };
}

export async function listRecommendations(repositoryId: string) {
  const { rows } = await database().query<RecommendationRow & Pick<Recommendation, "implementation" | "history">>(`
    SELECT r.slug, r.title, r.hypothesis, ${budgetColumns}, events.implementation, events.history
    FROM recommendations r
    JOIN projects p ON p.repository_id = r.repository_id AND p.is_public
    CROSS JOIN LATERAL (
      SELECT (array_agg(
        (payload - 'type') || jsonb_build_object('registeredAt', created_at)
      ) FILTER (WHERE kind = 'implement'))[1] AS implementation,
      COALESCE(jsonb_agg(jsonb_build_object(
        'id', id::text, 'kind', kind, 'status', status, 'verification', verification, 'createdAt', created_at
      ) ORDER BY id DESC), '[]'::jsonb) AS history
      FROM recommendation_events WHERE recommendation_id = r.id
    ) events
    WHERE r.repository_id = $1
    ORDER BY r.slug
  `, [repositoryId]);
  return rows.map(({ history, implementation, ...row }): Recommendation => ({
    ...row,
    implementation: implementation && { ...implementation, registeredAt: new Date(implementation.registeredAt).toISOString() },
    history: history.map((event) => ({ ...event, createdAt: new Date(event.createdAt).toISOString() })),
    status: history[0]?.status ?? "suggested",
  }));
}

async function verify(client: PoolClient, repositoryId: string, registration: Registration, budgets: ScenarioBudgets,
  { landingComparisonId, scrollComparisonId }: Extract<EventInput, { type: "verify" }>) {
  const { rows } = await client.query<VerificationComparison>(`
    SELECT c.id, c.scenario_key AS scenario, c.verdict, c.reason, c.metrics, c.attempt,
      c.workflow_run_id AS "workflowRunId", c.pull_request AS "pullRequest", c.runner_id AS "runnerId",
      c.baseline_sha AS "baselineSha", c.candidate_sha AS "candidateSha",
      c.policy_version AS "policyVersion", c.created_at AS "createdAt",
      samples.started_at AS "captureStartedAt", samples.baseline AS "baselineSamples", samples.candidate AS "candidateSamples"
    FROM dashboard_comparisons c
    CROSS JOIN LATERAL (
      SELECT MIN(r.started_at) AS started_at,
        COALESCE(array_agg(o.reading) FILTER (WHERE slot.side = 'baseline' AND o.reading IS NOT NULL), '{}') AS baseline,
        COALESCE(array_agg(o.reading) FILTER (WHERE slot.side = 'candidate' AND o.reading IS NOT NULL), '{}') AS candidate
      FROM dashboard_comparison_pairs pair
      CROSS JOIN LATERAL (VALUES ('baseline', pair.baseline_run_id), ('candidate', pair.candidate_run_id)) AS slot(side, run_id)
      JOIN runs r ON r.id = slot.run_id AND r.repository_id = c.repository_id
      LEFT JOIN observations o ON o.run_id = r.id AND pair.kind = 'comparison' AND o.unit = 'ms'
        AND o.metric = CASE c.scenario_key WHEN 'dashboard-landing' THEN 'time_to_usable' ELSE 'time_to_assertion' END
      WHERE pair.comparison_id = c.id
    ) samples
    WHERE c.repository_id = $1 AND c.id IN ($2, $3)
  `, [repositoryId, landingComparisonId, scrollComparisonId]);
  const landing = rows.find((row) => row.id === landingComparisonId);
  const scroll = rows.find((row) => row.id === scrollComparisonId);
  if (!landing || !scroll || landing.scenario !== "dashboard-landing" || scroll.scenario !== "dashboard-scroll" ||
      landing.workflowRunId !== scroll.workflowRunId || landing.attempt !== scroll.attempt ||
      landing.runnerId !== scroll.runnerId || landing.policyVersion !== scroll.policyVersion ||
      rows.some((row) => row.baselineSha !== registration.baselineSha || row.candidateSha !== registration.implementationSha ||
        row.pullRequest !== registration.pullRequest)) {
    throw new RecommendationConflict("The two comparisons must match the registered PR and commit pair and share one workflow attempt.");
  }
  if (rows.some((row) => row.createdAt < registration.registeredAt ||
      (row.captureStartedAt && row.captureStartedAt < registration.registeredAt))) {
    throw new RecommendationConflict("The benchmark must be captured after the implementation is registered.");
  }
  return evaluateVerification(landing, scroll, budgets);
}

export async function recordRecommendationEvent(repositoryId: string, slug: string, input: EventInput) {
  const client = await database().connect();
  try {
    await client.query("BEGIN");
    // Read the event history only after taking the recommendation lock.
    const { rows: [recommendation] } = await client.query<Pick<RecommendationRow, "policyVersion" | "budgets"> & { id: string }>(`
      SELECT id, ${budgetColumns} FROM recommendations WHERE repository_id = $1 AND slug = $2 FOR UPDATE
    `, [repositoryId, slug]);
    if (!recommendation) {
      await client.query("ROLLBACK");
      return { status: "missing" } as const;
    }

    const key = input.type === "verify" ? `verify:${input.landingComparisonId}:${input.scrollComparisonId}` : input.type;
    const payload = JSON.stringify(input);
    const { rows: [previous] } = await client.query<EventRow & { identical: boolean }>(`
      SELECT ${eventColumns}, payload = $3::jsonb AS identical
      FROM recommendation_events WHERE recommendation_id = $1 AND event_key = $2
    `, [recommendation.id, key, payload]);
    if (previous) {
      if (!previous.identical) throw new RecommendationConflict("A different implementation is already registered.");
      await client.query("COMMIT");
      return { status: "replayed", event: toEvent(previous) } as const;
    }

    const { rows: [latest] } = await client.query<{ status: RecommendationEvent["status"] }>(`
      SELECT status FROM recommendation_events WHERE recommendation_id = $1 ORDER BY id DESC LIMIT 1
    `, [recommendation.id]);
    if (latest?.status === "dismissed") throw new RecommendationConflict("This recommendation is dismissed.");

    let verification: Verification | null = null;
    if (input.type === "verify") {
      const { rows: [registered] } = await client.query<{ payload: Implementation; registeredAt: Date }>(`
        SELECT payload, created_at AS "registeredAt" FROM recommendation_events
        WHERE recommendation_id = $1 AND event_key = 'implement'
      `, [recommendation.id]);
      if (!registered) throw new RecommendationConflict("Register the implementation before attaching comparisons.");
      if (recommendation.policyVersion !== verificationPolicyVersion) {
        throw new RecommendationConflict("The recommendation policy version is unavailable.");
      }
      verification = await verify(client, repositoryId, { ...registered.payload, registeredAt: registered.registeredAt },
        recommendation.budgets, input);
    }

    const status = verification?.status ?? (input.type === "dismiss" ? "dismissed" : "implemented");
    const { rows: [event] } = await client.query<EventRow>(`
      INSERT INTO recommendation_events (recommendation_id, event_key, kind, status, payload,
        landing_comparison_id, scroll_comparison_id, verification)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${eventColumns}
    `, [recommendation.id, key, input.type, status, payload,
      verification?.landing.comparisonId ?? null, verification?.scroll.comparisonId ?? null, verification]);
    await client.query("COMMIT");
    return { status: "created", event: toEvent(event) } as const;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof RecommendationConflict) return { status: "conflict", reason: error.message } as const;
    throw error;
  } finally {
    client.release();
  }
}
