import { createHash, timingSafeEqual } from "node:crypto";
import type { RunSummary } from "./types";

export function unavailable(error: unknown) {
  console.error("Measurements database request failed", error);
  return Response.json({ error: "Measurements are temporarily unavailable. Please retry." }, {
    status: 503,
    headers: { "Retry-After": "5", "Cache-Control": "no-store" },
  });
}

export function authorizePilotUpload(request: Request) {
  const token = process.env.EFFICTIV_PILOT_WRITE_TOKEN;
  if (!token) return unavailable(new Error("EFFICTIV_PILOT_WRITE_TOKEN is required"));
  const authorization = request.headers.get("authorization") ?? "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(authorization), digest(`Bearer ${token}`))) {
    return Response.json({ error: "A valid pilot upload credential is required." }, { status: 401 });
  }
}

function csvCell(value: string | number | null) {
  if (value === null) return "";
  if (typeof value === "number") return String(value);
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function measurementsCsv(headers: string[], rows: (string | number | null)[][]) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function runsCsv(runs: RunSummary[]) {
  const headers = [
    "Run ID", "Started at (UTC)", "Scenario", "Revision", "Commit", "Collector", "Collector version",
    "Source run ID", "Assertion", "Completed visits", "Failed visits", "Energy (Wh)", "Energy (Wh/visit)",
    "Original energy readings", "Measurement boundary", "Energy status reason", "Phase",
    "Mean time to usable (ms)", "Mean transferred bytes", "Source artifact", "Source SHA-256",
    "Estimated web delivery (gCO₂e)", "Estimated web delivery (gCO₂e/visit)", "Web delivery input bytes",
    "CO2.js version", "Sustainable Web Design version", "Web delivery grid region",
    "Web delivery grid intensity (gCO₂e/kWh)", "Web delivery green hosting factor",
    "Web delivery cache policy", "Web delivery boundary",
  ];
  const rows = runs.map((run) => {
    const estimate = run.webDeliveryEstimate;
    return [
      run.id, run.startedAt, run.scenario, run.revision, run.commitSha, run.collector, run.collectorVersion,
      run.sourceRunId, run.assertion, run.completedVisits, run.failedVisits, run.energyWh, run.energyWhPerVisit,
      run.energyReadings.map(({ domain, value, unit }) => `${domain} ${value} ${unit}`).join(" | "),
      run.energyCoverage, run.energyUnavailableReason, run.energyPhase, run.meanTimeToUsableMs,
      run.meanTransferredBytes, run.sourceUrl, run.sourceSha256,
      estimate?.totalGramsCo2e ?? null, estimate?.gramsCo2ePerVisit ?? null, estimate?.transferredBytes ?? null,
      estimate?.estimatorVersion ?? null, estimate?.modelVersion ?? null, estimate?.assumptions.gridRegion ?? null,
      estimate?.assumptions.gridIntensityGramsCo2ePerKwh ?? null, estimate?.assumptions.greenHostingFactor ?? null,
      estimate?.assumptions.cachePolicy ?? null, estimate?.assumptions.boundary ?? null,
    ];
  });
  return measurementsCsv(headers, rows);
}
