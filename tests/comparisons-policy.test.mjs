import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateComparison } from "../lib/comparisons/policy.mjs";
import { evaluateVerification } from "../lib/recommendations/policy.mjs";
import { comparisonUploadSchema } from "../lib/comparisons/schema.mjs";
import { comparisonUpload, evidence } from "./comparison-fixtures.mjs";

const evaluate = ({ calibration, comparison }) => evaluateComparison(calibration, comparison);

test("calibrated paired policy reports improvement, regression, spread, and A/A", () => {
  const improved = evaluate(evidence("landing", 100, [91, 90, 89, 89, 91, 86], 2));
  assert.equal(improved.verdict, "improved");
  assert.deepEqual(improved.metrics, {
    baselineWhPerVisit: 100, candidateWhPerVisit: 89.5, deltaWhPerVisit: -10.5,
    lowerWhPerVisit: -14, upperWhPerVisit: -9, thresholdWhPerVisit: 2, deltaPercent: -10.5,
  });
  assert.equal(evaluate(evidence("scroll", 100, 110)).verdict, "regressed");
  assert.equal(evaluate(evidence("landing", 100, [99, 100, 101, 99, 100, 101], 1, true)).verdict, "inconclusive");
  assert.equal(evaluate(evidence("landing", 100, [90, 90, 90, 90, 90, 99])).verdict, "inconclusive");
  assert.equal(evaluate(evidence("landing", 100, 101)).verdict, "inconclusive");
});

test("a measured zero can be compared and has no percentage delta", () => {
  const zero = evaluate(evidence("landing", 0, 5));
  assert.equal(zero.verdict, "regressed");
  assert.equal(zero.metrics.baselineWhPerVisit, 0);
  assert.equal(zero.metrics.deltaPercent, null);
  assert.equal(evaluate(evidence("landing", 0, 0)).verdict, "inconclusive");
});

test("missing, failed, unavailable, or mismatched runs are ineligible", () => {
  const missing = evidence("landing");
  missing.comparison[0].baseline = null;
  assert.match(evaluate(missing).reason, /missing/);

  const failed = evidence("landing");
  const failedRun = failed.comparison[0].baseline.result;
  failedRun.assertion = "failed";
  failedRun.workload.assertion = "failed";
  failedRun.workload.completedVisits--;
  failedRun.workload.failedVisits++;
  failedRun.workload.visits[0] = { assertion: "failed", reason: "Intentional test assertion failure" };
  assert.match(evaluate(failed).reason, /assertion failed/);

  const unavailable = evidence("landing");
  unavailable.calibration[0].candidate.result.energy = {
    status: "unavailable", metric: "cpu_energy_rapl_msr_component", phase: "Dashboard visits", readings: [], reason: "Unavailable",
  };
  assert.match(evaluate(unavailable).reason, /energy is unavailable/);

  const mismatched = evidence("landing");
  mismatched.comparison[0].candidate.result.hardware.logicalCpusAvailable++;
  const ineligible = evaluate(mismatched);
  assert.match(ineligible.reason, /conditions/);
  assert.equal(ineligible.verdict, "ineligible");
  assert.equal(ineligible.metrics, null);
});

test("validation rejects tampering, duplicate source runs, and incorrect assignment", () => {
  assert.ok(comparisonUploadSchema.safeParse(comparisonUpload()).success);

  const tampered = comparisonUpload();
  tampered.scenarios[0].comparison[0].baseline.log += "tampered";
  assert.equal(comparisonUploadSchema.safeParse(tampered).success, false);

  const duplicate = comparisonUpload();
  duplicate.scenarios[0].calibration[0].candidate = duplicate.scenarios[0].calibration[0].baseline;
  assert.equal(comparisonUploadSchema.safeParse(duplicate).success, false);

  const wrongCommit = comparisonUpload();
  wrongCommit.scenarios[0].comparison[0].candidate.result.commitSha = wrongCommit.baselineSha;
  assert.equal(comparisonUploadSchema.safeParse(wrongCommit).success, false);
});

test("optimization policy checks nearest-rank p95, eligibility and both latency budgets", () => {
  const budgets = { "dashboard-landing": 100, "dashboard-scroll": 200 };
  const landing = {
    ...evaluate(evidence("landing")), id: "landing", scenario: "dashboard-landing",
    baselineSamples: Array(180).fill(1000),
    candidateSamples: [...Array(171).fill(1100), ...Array(9).fill(5000)],
  };
  const scroll = {
    ...evaluate(evidence("scroll", 100, [100, 100, 101, 100, 100, 101])), id: "scroll", scenario: "dashboard-scroll",
    baselineSamples: Array(180).fill(1500),
    candidateSamples: Array(180).fill(1700),
  };
  const passing = evaluateVerification(landing, scroll, budgets);
  assert.equal(passing.status, "verified");
  assert.equal(passing.landing.latency.candidateP95Ms, 1100);
  assert.equal(passing.scroll.energy.upperWhPerVisit, passing.scroll.energy.thresholdWhPerVisit);

  const noisy = evaluateVerification({ ...landing, verdict: "inconclusive" }, scroll, budgets);
  assert.equal(noisy.status, "inconclusive");
  assert.match(noisy.reasons[0], /Landing did not show/);

  const slow = evaluateVerification({ ...landing, candidateSamples: Array(180).fill(1101) },
    { ...scroll, candidateSamples: Array(180).fill(1701) }, budgets);
  assert.deepEqual(slow.reasons, [
    "Landing p95 exceeded the latency budget by 1 ms.", "Scroll p95 exceeded the latency budget by 1 ms.",
  ]);

  const missing = evaluateVerification(landing, {
    ...scroll, verdict: "ineligible", reason: "A dashboard correctness assertion failed.", metrics: null,
    candidateSamples: scroll.candidateSamples.slice(1),
  }, budgets);
  assert.equal(missing.status, "inconclusive");
  assert.match(missing.reasons[0], /correctness assertion failed/);
  assert.match(missing.reasons[1], /latency samples/);
  assert.equal(missing.scroll.latency.deltaMs, null);
});
