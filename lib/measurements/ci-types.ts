import type { summarizeEcoCiArtifact } from "./eco-ci-schema.mjs";

export type CiRunSummary = ReturnType<typeof summarizeEcoCiArtifact> & {
  id: string;
  runId: string;
  attempt: number;
  job: string;
  commitSha: string;
  startedAt: string | null;
  finishedAt: string;
  artifactUrl: string;
  artifactSha256: string;
};

export type CiRunPage = { runs: CiRunSummary[]; nextCursor: string | null };
