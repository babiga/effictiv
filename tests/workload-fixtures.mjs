export function workloadReport() {
  const sample = (bytes) => ({ completed: 1, failed: 0, elapsedMs: 40, transferBytes: bytes });
  const inventory = {
    files: 1,
    bytes: 2000,
    largest: [{ path: "hero.png", bytes: 2000 }],
    groups: [],
    duplicates: [],
  };
  return {
    version: 1,
    repositoryId: "602",
    runId: "9100",
    attempt: 1,
    workflowSha: "e".repeat(40),
    commitSha: "e".repeat(40),
    baseSha: "a".repeat(40),
    configHash: "c".repeat(64),
    runner: "Test Linux runner",
    inventory,
    baselineInventory: inventory,
    changes: [],
    setupError: null,
    workloads: [
      {
        target: { id: "home", kind: "page", unit: "visit", metric: "transferBytes", per: 1, budget: 1000 },
        error: null,
        energySource: null,
        baseDelivery: null,
        headDelivery: null,
        calibration: Array.from({ length: 12 }, () => sample(1500)),
        base: Array.from({ length: 6 }, () => sample(1500)),
        head: Array.from({ length: 6 }, () => sample(1250)),
      },
    ],
  };
}
