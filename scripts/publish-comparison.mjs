import { appendFile, lstat, readFile } from "node:fs/promises";
import { z } from "zod";
import { comparisonUploadSchema, maxComparisonBytes } from "../lib/comparisons/schema.mjs";
import { pilotRepositoryId, pilotRepositoryName } from "../lib/measurements/pilot.mjs";

const [file, workflowRunId, attempt, pullRequest, baselineSha, candidateSha] = process.argv.slice(2);
const { EFFICTIV_URL, EFFICTIV_PILOT_WRITE_TOKEN, GITHUB_STEP_SUMMARY } = process.env;
if (!file || !EFFICTIV_URL || !EFFICTIV_PILOT_WRITE_TOKEN) {
  throw new Error("Provide a comparison artifact, EFFICTIV_URL and EFFICTIV_PILOT_WRITE_TOKEN.");
}
const origin = new URL(EFFICTIV_URL);
const local = origin.protocol === "http:" && ["127.0.0.1", "localhost"].includes(origin.hostname);
if ((!local && origin.protocol !== "https:") || origin.username || origin.password || origin.pathname !== "/" ||
    origin.search || origin.hash || /[()\s]/.test(origin.origin)) {
  throw new Error("EFFICTIV_URL must be an HTTPS origin or a local HTTP origin.");
}
const stat = await lstat(file);
if (!stat.isFile() || stat.size > maxComparisonBytes) throw new Error("Invalid comparison artifact file or size.");
const upload = comparisonUploadSchema.parse(JSON.parse(await readFile(file, "utf8")));
if (upload.repositoryId !== pilotRepositoryId || upload.workflowRunId !== workflowRunId ||
    String(upload.attempt) !== attempt || String(upload.pullRequest) !== pullRequest ||
    upload.baselineSha !== baselineSha || upload.candidateSha !== candidateSha ||
    upload.runnerId !== `run-${workflowRunId}-attempt-${attempt}`) {
  throw new Error("The artifact does not match the trusted GitHub workflow metadata.");
}

const endpoint = new URL("/api/v1/comparisons", origin);
const response = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${EFFICTIV_PILOT_WRITE_TOKEN}` },
  body: JSON.stringify(upload),
  redirect: "error",
  signal: AbortSignal.timeout(60_000),
});
if (!response.ok) {
  throw new Error(`Comparison publication returned HTTP ${response.status}. Retry publication using the same artifact.`);
}

const { comparisons } = z.strictObject({
  comparisons: z.array(z.strictObject({
    id: z.uuid(),
    scenario: z.enum(["dashboard-landing", "dashboard-scroll"]),
    verdict: z.enum(["improved", "regressed", "inconclusive", "ineligible"]),
  })).length(2),
}).parse(await response.json());
const repo = `https://github.com/${pilotRepositoryName}`;
const lines = [
  "## Advisory dashboard energy comparison",
  "",
  `[Baseline ${baselineSha.slice(0, 12)}](${repo}/commit/${baselineSha}) · [Candidate ${candidateSha.slice(0, 12)}](${repo}/commit/${candidateSha}) · [PR #${pullRequest}](${repo}/pull/${pullRequest})`,
  "",
  "| Scenario | Verdict | First available source runs |",
  "| --- | --- | --- |",
];
for (const row of comparisons) {
  const evidence = upload.scenarios.find(({ scenario }) => scenario === row.scenario);
  if (!evidence) throw new Error("Unexpected comparison scenario in publication response.");
  const link = (side) => {
    const digest = evidence.comparison.find((pair) => pair[side])?.[side]?.result.sourceLog.sha256;
    return digest ? `[${side}](${origin.origin}/api/v1/projects/${pilotRepositoryId}/comparison-artifacts/${digest})` : `${side} unavailable`;
  };
  lines.push(`| [${row.scenario}](${origin.origin}/dashboard/comparisons/${row.id}) | ${row.verdict} | ${link("baseline")} · ${link("candidate")} |`);
}
const summary = `${lines.join("\n")}\n`;
if (GITHUB_STEP_SUMMARY) await appendFile(GITHUB_STEP_SUMMARY, summary);
else process.stdout.write(summary);
