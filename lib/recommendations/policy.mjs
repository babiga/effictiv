import { comparisonPairCount, comparisonVisitCount } from "../comparisons/schema.mjs";

export const verificationPolicyVersion = 1;
const expectedVisits = comparisonPairCount * comparisonVisitCount;

function p95(samples) {
  if (samples.length !== expectedVisits) return null;
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.95) - 1];
}

function describe(path, budgetMs, metric) {
  const baselineP95Ms = p95(path.baselineSamples);
  const candidateP95Ms = p95(path.candidateSamples);
  const deltaMs = baselineP95Ms === null || candidateP95Ms === null ? null : candidateP95Ms - baselineP95Ms;
  return {
    comparisonId: path.id, scenario: path.scenario, verdict: path.verdict, reason: path.reason, energy: path.metrics,
    latency: { metric, baselineP95Ms, candidateP95Ms, deltaMs, budgetMs },
  };
}

/** @returns {import("./types").Verification} */
export function evaluateVerification(landing, scroll, budgets) {
  const landingEvidence = describe(landing, budgets["dashboard-landing"], "time_to_usable");
  const scrollEvidence = describe(scroll, budgets["dashboard-scroll"], "time_to_assertion");
  const reasons = [];

  if (landing.verdict !== "improved" || !landing.metrics) {
    reasons.push(`Landing did not show an energy improvement. ${landing.reason}`);
  }
  if (scroll.verdict === "ineligible" || !scroll.metrics) {
    reasons.push(`Scroll energy is ineligible. ${scroll.reason}`);
  } else if (scroll.metrics.upperWhPerVisit > scroll.metrics.thresholdWhPerVisit) {
    reasons.push("The scroll energy interval allows an increase beyond the calibrated threshold.");
  }

  for (const [label, { latency }] of [["Landing", landingEvidence], ["Scroll", scrollEvidence]]) {
    if (latency.deltaMs === null) {
      reasons.push(`${label} is missing a complete set of latency samples.`);
    } else if (latency.deltaMs > latency.budgetMs) {
      reasons.push(`${label} p95 exceeded the latency budget by ${latency.deltaMs - latency.budgetMs} ms.`);
    }
  }
  return {
    status: reasons.length ? "inconclusive" : "verified",
    reasons,
    landing: landingEvidence,
    scroll: scrollEvidence,
  };
}
