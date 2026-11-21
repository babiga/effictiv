export type Scenario = "dashboard-landing" | "dashboard-scroll";
export type Verdict = "improved" | "regressed" | "inconclusive" | "ineligible";

export type Evaluation = {
  verdict: Verdict;
  reason: string;
  pairCount: number;
  calibrationPairCount: number;
  metrics: {
    baselineWhPerVisit: number;
    candidateWhPerVisit: number;
    deltaWhPerVisit: number;
    lowerWhPerVisit: number;
    upperWhPerVisit: number;
    thresholdWhPerVisit: number;
    deltaPercent: number | null;
  } | null;
};

export type Comparison = Evaluation & {
  id: string;
  scenario: Scenario;
  baselineSha: string;
  candidateSha: string;
  workflowRunId: string;
  attempt: number;
  pullRequest: number;
  policyVersion: number;
  runnerId: string;
  createdAt: string;
};

type EvidenceRun = {
  id: string;
  completedVisits: number;
  failedVisits: number;
  energyWhPerVisit: number | null;
  sourceUrl: string;
};

export type EvidencePair = {
  kind: "calibration" | "comparison";
  ordinal: number;
  baseline: EvidenceRun | null;
  candidate: EvidenceRun | null;
};

export type ComparisonDetail = Comparison & { pairs: EvidencePair[] };
export type ComparisonPage = { comparisons: Comparison[]; nextCursor: string | null };
