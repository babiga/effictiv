import { co2 } from "@tgwf/co2";
import { evaluate, median, metricUnits } from "./model.mjs";

const deliveryModel = new co2({ model: "swd", version: 4 });
export const carbonMethod = "CO2.js 0.19.0 · SWD v4 · global grid · cold visit · green hosting factor 0";
export const treeMethod =
  "https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references";
/** @param {import("zod").output<typeof import("./model.mjs").workloadSchema>} w */
export function insights(w, volume = 1000) {
  const evaluation = evaluate(w);
  const { target, headDelivery, baseDelivery } = w;
  const advice = (headDelivery?.hints ?? []).map((h) => ({ ...h, status: "suggested" }));
  if (
    evaluation.verdict === "improved" &&
    target.metric === "transferBytes" &&
    headDelivery &&
    baseDelivery
  ) {
    for (const hint of baseDelivery.hints) {
      const a = baseDelivery.resources.find((r) => r.path === hint.path);
      const b = headDelivery.resources.find((r) => r.path === hint.path);
      if (a && b && b.bytes < a.bytes && !headDelivery.hints.some((h) => h.path === hint.path)) {
        advice.push({
          path: hint.path,
          detail: `Image finding resolved. The traced resource transferred ${a.bytes - b.bytes} fewer bytes.`,
          status: "verified",
          potentialBytes: 0,
        });
      }
    }
  }
  if (
    !advice.length &&
    (evaluation.verdict === "regressed" || (evaluation.score !== null && evaluation.score < 100))
  ) {
    const detail =
      target.kind === "page"
        ? "Inspect the largest transferred resources below, then repeat this cold visit."
        : target.kind === "http"
          ? "Profile the handler under this request fixture. Inspect response size and CPU time before choosing a change."
          : "Profile the command with the same input and output digest to locate the expensive step.";
    advice.push({ path: w.subject ?? target.id, detail, status: "investigate", potentialBytes: 0 });
  }
  const scale =
    evaluation.verdict === "improved" && target.metric !== "peakRssBytes" && evaluation.delta !== null;
  const saved = scale ? (-evaluation.delta * volume) / target.per : null;
  const pageBytes = w.head.every((s) => s.transferBytes != null)
    ? median(w.head.map((s) => s.transferBytes / s.completed))
    : null;
  const gramsPerVisit =
    target.kind === "page" && !w.error && pageBytes !== null ? deliveryModel.perByte(pageBytes, false) : null;
  const grams =
    saved !== null && target.kind === "page" && target.metric === "transferBytes"
      ? deliveryModel.perByte(saved, false)
      : null;
  // EPA's annual average over ten years is 0.060 metric tons CO2 per urban tree.
  const seedlings = grams !== null && grams >= 600000 ? grams / 600000 : null;
  return {
    ...evaluation,
    advice,
    saved,
    savedUnit: metricUnits[target.metric],
    grams,
    gramsPerVisit,
    seedlings,
  };
}
