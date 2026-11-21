import { comparisonPairCount, comparisonVisitCount } from "./schema.mjs";
import { energyWhPerVisit } from "../measurements/energy.mjs";

export const policyVersion = 1;

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = sorted.length / 2;
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function conditions(run) {
  const { workload, energy } = run;
  return JSON.stringify([
    run.schemaVersion, run.scenario, run.functionalUnit, workload.revision, workload.fixtureSha256,
    workload.mockDataSha256, workload.browserVersion, workload.viewport.width, workload.viewport.height,
    workload.cachePolicy, run.hardware, run.collector, energy.metric, energy.phase, energy.coverage,
    energy.readings.map(({ domain }) => domain).sort(),
  ]);
}

/** @returns {import("./types").Evaluation} */
export function evaluateComparison(calibration, comparison) {
  const allPairs = [...calibration, ...comparison];
  const pairCount = comparison.filter(({ baseline, candidate }) => baseline && candidate).length;
  const calibrationPairCount = calibration.filter(({ baseline, candidate }) => baseline && candidate).length;
  const counts = { pairCount, calibrationPairCount };
  const ineligible = (reason) => ({ ...counts, verdict: "ineligible", reason, metrics: null });

  if (pairCount !== comparisonPairCount || calibrationPairCount !== comparisonPairCount) {
    return ineligible("One or more matched repetitions are missing.");
  }

  const runs = allPairs.flatMap(({ baseline, candidate }) => [baseline.result, candidate.result]);
  if (runs.some(({ assertion, workload }) => assertion !== "passed" || workload.assertion !== "passed" || workload.failedVisits)) {
    return ineligible("A dashboard correctness assertion failed.");
  }
  if (runs.some(({ energy }) => energy.status !== "available")) {
    return ineligible("CPU package energy is unavailable for one or more runs.");
  }
  const expected = conditions(runs[0]);
  if (runs.some((run) => run.workload.completedVisits !== comparisonVisitCount || conditions(run) !== expected)) {
    return ineligible("Measurement conditions or visit counts differ from the matched workload.");
  }

  const rates = (pairs) => pairs.map(({ baseline, candidate }) => ({
    baseline: energyWhPerVisit(baseline.result),
    candidate: energyWhPerVisit(candidate.result),
  }));
  const calibrationRates = rates(calibration);
  const pairedRates = rates(comparison);
  const baselineWhPerVisit = median(pairedRates.map((pair) => pair.baseline));
  const candidateWhPerVisit = median(pairedRates.map((pair) => pair.candidate));
  const differences = pairedRates.map((pair) => pair.candidate - pair.baseline);
  const lowerWhPerVisit = Math.min(...differences);
  const upperWhPerVisit = Math.max(...differences);
  const thresholdWhPerVisit = Math.max(
    ...calibrationRates.map((pair) => Math.abs(pair.candidate - pair.baseline)),
    median(calibrationRates.map((pair) => pair.baseline)) * 0.01,
  );
  const deltaWhPerVisit = median(differences);
  const percent = baselineWhPerVisit > 0 ? (deltaWhPerVisit / baselineWhPerVisit) * 100 : null;
  const metrics = {
    baselineWhPerVisit, candidateWhPerVisit, deltaWhPerVisit, lowerWhPerVisit, upperWhPerVisit, thresholdWhPerVisit,
    deltaPercent: Number.isFinite(percent) ? percent : null,
  };

  if (upperWhPerVisit < -thresholdWhPerVisit) {
    return { ...counts, verdict: "improved", reason: "Every paired difference is below the improvement threshold.", metrics };
  }
  if (lowerWhPerVisit > thresholdWhPerVisit) {
    return { ...counts, verdict: "regressed", reason: "Every paired difference is above the regression threshold.", metrics };
  }
  return { ...counts, verdict: "inconclusive", reason: "The paired interval does not clear the calibrated noise threshold.", metrics };
}
