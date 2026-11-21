import type { RunSummary } from "./types";

export function unavailable(error: unknown) {
  console.error("Measurements database request failed", error);
  return Response.json({ error: "Measurements are temporarily unavailable. Please retry." }, {
    status: 503,
    headers: { "Retry-After": "5", "Cache-Control": "no-store" },
  });
}

function csvCell(value: string | number | null) {
  if (value === null) return "";
  if (typeof value === "number") return String(value);
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function runsCsv(runs: RunSummary[]) {
  const headers = [
    "Run ID", "Started at (UTC)", "Scenario", "Revision", "Commit", "Collector", "Collector version",
    "Source run ID", "Assertion", "Completed visits", "Failed visits", "Energy (Wh)", "Energy (Wh/visit)",
    "Original energy readings", "Measurement boundary", "Energy status reason", "Phase",
    "Mean time to usable (ms)", "Mean transferred bytes", "Source artifact", "Source SHA-256",
  ];
  const rows = runs.map((run) => [
    run.id, run.startedAt, run.scenario, run.revision, run.commitSha, run.collector, run.collectorVersion,
    run.sourceRunId, run.assertion, run.completedVisits, run.failedVisits, run.energyWh, run.energyWhPerVisit,
    run.energyReadings.map(({ domain, value, unit }) => `${domain} ${value} ${unit}`).join(" | "),
    run.energyCoverage, run.energyUnavailableReason, run.energyPhase, run.meanTimeToUsableMs,
    run.meanTransferredBytes, run.sourceUrl, run.sourceSha256,
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
