export type WebDeliveryEstimate = {
  transferredBytes: string;
  totalGramsCo2e: number;
  gramsCo2ePerVisit: number;
  estimatorVersion: string;
  modelVersion: number;
  assumptions: {
    gridRegion: string;
    gridIntensityGramsCo2ePerKwh: number;
    greenHostingFactor: number;
    cachePolicy: string;
    boundary: string;
  };
};

export type RunSummary = {
  id: string;
  scenario: string;
  revision: number;
  commitSha: string;
  startedAt: string;
  collector: string;
  collectorVersion: string;
  sourceRunId: string;
  sourceUrl: string;
  sourceSha256: string;
  completedVisits: number;
  failedVisits: number;
  assertion: "passed" | "failed";
  energyWh: number | null;
  energyWhPerVisit: number | null;
  energyCoverage: string | null;
  energyUnavailableReason: string | null;
  energyPhase: string;
  energyReadings: Array<{ domain: string; value: number; unit: string }>;
  meanTimeToUsableMs: number | null;
  meanTransferredBytes: number | null;
  webDeliveryEstimate: WebDeliveryEstimate | null;
};

export type RunPage = { runs: RunSummary[]; nextCursor: string | null };
