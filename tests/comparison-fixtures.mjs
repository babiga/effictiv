import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { comparisonPairCount, comparisonVisitCount } from "../lib/comparisons/schema.mjs";
import { pilotRepositoryId } from "../lib/measurements/pilot.mjs";

export const baselineSha = "a".repeat(40);
export const candidateSha = "b".repeat(40);

export function capture(path, commitSha, whPerVisit) {
  const result = JSON.parse(readFileSync(new URL(`../benchmarks/dashboard/fixtures/smoke-v1/${path}.json`, import.meta.url)));
  const sourceRunId = randomUUID();
  const log = `GMT synthetic fixture for ${sourceRunId}\n`;
  Object.assign(result, {
    commitSha, sourceRunId,
    sourceLog: { name: `${path}.log`, sha256: createHash("sha256").update(log).digest("hex") },
    collector: { name: "Green Metrics Tool", version: "4.2", commit: "7f11a4309dd1d26f5bb8e97e561ef3a65c1a61d2" },
    hardware: { ...result.hardware, raplMsrDevicePresent: true },
    energy: {
      status: "available", metric: "cpu_energy_rapl_msr_component", phase: "Dashboard visits", phaseDurationUs: 60_000_000,
      coverage: "Host CPU packages, including Chromium and Next.js CPU activity",
      readings: [{ domain: "Package_0", value: whPerVisit * comparisonVisitCount, unit: "Wh" }],
    },
  });
  const visit = result.workload.visits[0];
  result.workload.visits = Array.from({ length: comparisonVisitCount }, () => ({ ...visit }));
  result.workload.completedVisits = comparisonVisitCount;
  return { result, log };
}

export function evidence(path, before = 100, after = 90, calibrationNoise = 0, control = false) {
  function pairs(candidate, adjustment) {
    return Array.from({ length: comparisonPairCount }, (_, index) => ({
      baseline: capture(path, baselineSha, before),
      candidate: capture(path, candidate, adjustment(index)),
    }));
  }
  return {
    scenario: `dashboard-${path}`,
    calibration: pairs(baselineSha, (index) => before + (index % 2 ? calibrationNoise : -calibrationNoise)),
    comparison: pairs(control ? baselineSha : candidateSha, (index) => Array.isArray(after) ? after[index] : after),
  };
}

export function comparisonUpload(workflowRunId = "12345") {
  return {
    version: 1, repositoryId: pilotRepositoryId, workflowRunId, attempt: 1, pullRequest: 5,
    baselineSha, candidateSha, runnerId: `run-${workflowRunId}-attempt-1`,
    scenarios: [evidence("landing"), evidence("scroll", 100, 110)],
  };
}
