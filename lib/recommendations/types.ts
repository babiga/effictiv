import type { Comparison, Scenario, Verdict } from "../comparisons/types";

export type RecommendationStatus = "suggested" | "implemented" | "verified" | "inconclusive" | "dismissed";
export type ScenarioBudgets = Record<Scenario, number>;

export type Implementation = {
  pullRequest: number;
  baselineSha: string;
  implementationSha: string;
};

export type ScenarioEvidence = {
  comparisonId: string;
  scenario: Scenario;
  verdict: Verdict;
  reason: string;
  energy: Comparison["metrics"];
  latency: {
    metric: "time_to_usable" | "time_to_assertion";
    baselineP95Ms: number | null;
    candidateP95Ms: number | null;
    deltaMs: number | null;
    budgetMs: number;
  };
};

export type Verification = {
  status: "verified" | "inconclusive";
  reasons: string[];
  landing: ScenarioEvidence;
  scroll: ScenarioEvidence;
};

export type RecommendationEvent = {
  id: string;
  kind: "implement" | "verify" | "dismiss";
  status: Exclude<RecommendationStatus, "suggested">;
  createdAt: string;
  verification: Verification | null;
};

export type Recommendation = {
  slug: string;
  title: string;
  hypothesis: string;
  policyVersion: number;
  budgets: ScenarioBudgets;
  implementation: (Implementation & { registeredAt: string }) | null;
  status: RecommendationStatus;
  history: RecommendationEvent[];
};
