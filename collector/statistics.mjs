export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Compare interleaved A/A controls and matched base/head samples in their native units. */
export function pairedStatistics(controls, pairs) {
  const deltas = pairs.map((p) => p.candidate - p.baseline);
  const lower = Math.min(...deltas);
  const upper = Math.max(...deltas);
  const threshold = Math.max(
    median(controls.map((p) => p.baseline)) * 0.01,
    ...controls.map((p) => Math.abs(p.candidate - p.baseline)),
  );
  return {
    lower,
    upper,
    threshold,
    delta: median(deltas),
    verdict: upper < -threshold ? "improved" : lower > threshold ? "regressed" : "inconclusive",
  };
}
