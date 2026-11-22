import { z } from "zod";

const quantity = z.number().finite().nonnegative();
const positive = quantity.positive();
const count = z.int().nonnegative();
const label = z.string().min(1).max(240);
const sha = z.string().regex(/^[a-f0-9]{40}$/);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const metricUnits = {
  transferBytes: "B", cpuSeconds: "CPU s", elapsedMs: "ms", peakRssBytes: "B peak RSS", energyWh: "Wh",
};
const metric = z.enum(["transferBytes","cpuSeconds","elapsedMs","peakRssBytes","energyWh"]);
const target = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,47}$/),
  kind: z.enum(["page", "http", "command"]),
  unit: label, metric, budget: positive,
  // Each result and budget is normalized to this many successful units.
  per: z.int().min(1).max(1_000_000).default(1),
  maxP95Ms: positive.optional(),
});
const localUrl = z.url().refine(value => {
  const u = new URL(value);
  return u.protocol === "http:" && ["127.0.0.1", "localhost"].includes(u.hostname) && !u.username && !u.password;
}, "Use an HTTP URL on the benchmark runner's loopback interface.");
const scenario = target.extend({
  fixtures: z.array(z.string().min(1)).max(32).default([]),
  setup: z.string().min(1).optional(),
  server: z.string().min(1).optional(), url: localUrl.optional(),
  selector: z.string().min(1).optional(), expectedText: z.string().min(1).optional(),
  command: z.string().min(1).optional(), expectedSha256: digest.optional(),
  units: z.int().min(1).max(1_000_000).default(1),
  requests: z.int().min(1).max(10000).default(30),
  gmt: z.strictObject({ file: label, phase: label }).optional(),
}).superRefine((s, ctx) => {
  const require = (ok, message) => { if (!ok) ctx.addIssue({ code: "custom", message }); };
  if (s.kind === "page") require(s.server && s.url && s.selector && s.expectedText, "A page needs server, url, selector and expectedText.");
  if (s.kind === "http") require(s.server && s.url && s.expectedSha256, "HTTP needs server, url and an expected response SHA-256.");
  if (s.kind === "command") require(s.command && s.expectedSha256, "A command needs command and expected stdout SHA-256.");
  if (s.metric === "transferBytes") require(s.kind !== "command", "Transfer bytes need HTTP or a page.");
  if (s.gmt) require(s.kind === "command", "GMT phases require a command with an output digest and unit count.");
  if (s.kind === "page") require(!["cpuSeconds", "peakRssBytes"].includes(s.metric), "Page CPU and RSS exclude the browser.");
  if (s.metric === "peakRssBytes") require(s.per === 1, "Peak RSS is a per-execution peak.");
  if (s.kind !== "http") require(!s.maxP95Ms, "Use a batch deadline via elapsedMs; commands have no request p95.");
});
export const config = z.strictObject({
  version: z.literal(1), workloads: z.array(scenario).max(12),
}).refine(c => new Set(c.workloads.map(s => s.id)).size === c.workloads.length, "Workload IDs must be unique.");

const asset = z.object({ path: z.string().max(1024), bytes: count, width: count.optional(), height: count.optional() });
const category = z.enum(["images", "scripts", "styles", "fonts", "media", "other"]);
const group = z.object({ category, bytes: count, files: count });
export const inventorySchema = z.object({
  files: count, bytes: count, groups: z.array(group).max(6), largest: z.array(asset).max(12),
  duplicates: z.array(z.object({ paths: z.array(z.string().max(1024)).max(5), copies: count, redundantBytes: count })).max(8),
});
const sample = z.object({
  transferBytes: quantity.optional(), cpuSeconds: quantity.optional(), elapsedMs: quantity,
  peakRssBytes: quantity.optional(), energyWh: quantity.optional(), p95Ms: quantity.optional(),
  completed: count.positive(), failed: z.literal(0),
});
const delivery = z.object({
  groups: z.array(group).max(6), resources: z.array(asset).max(8), lcpMs: quantity.nullable(),
  requests: count, hints: z.array(z.object({ path: z.string().max(1024), detail: label, potentialBytes: count })).max(8),
});
export const workloadSchema = z.object({
  target, subject: z.string().max(1024).optional(), error: z.string().max(300).nullable(), calibration: z.array(sample).max(12),
  base: z.array(sample).max(6), head: z.array(sample).max(6),
  baseDelivery: delivery.nullable(), headDelivery: delivery.nullable(),
  energySource: z.string().max(240).nullable(),
});
export const reportSchema = z.object({
  version: z.literal(1), repositoryId: z.string().regex(/^[1-9]\d*$/), runId: z.string().regex(/^[1-9]\d*$/),
  attempt: z.int().positive(), workflowSha: sha, baseSha: sha.nullable(), commitSha: sha,
  configHash: digest.nullable(), setupError: z.string().max(300).nullable(),
  runner: label, inventory: inventorySchema, baselineInventory: inventorySchema.nullable(),
  changes: z.array(z.object({path:z.string().max(1024),before:count,after:count})).max(12).default([]),
  workloads: z.array(workloadSchema).max(12),
}).refine(r => new Set(r.workloads.map(w => w.target.id)).size === r.workloads.length, "Duplicate workload.");

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b) => a-b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function values(samples, target) {
  return samples.map(s => {
    const value = s[target.metric];
    if (typeof value !== "number") return null;
    return target.metric === "peakRssBytes" ? value : value * target.per / s.completed;
  });
}

export function evaluate(workload) {
  const {target, base, head, calibration} = workload;
  const a = values(base, target), b = values(head, target), c = values(calibration, target);
  const allowed = !workload.error && b.length > 0 && b.every(x => x !== null)
    && head.every(s => !target.maxP95Ms || (s.p95Ms != null && s.p95Ms <= target.maxP95Ms));
  const after = allowed ? median(b) : null;
  const before = a.includes(null) ? null : median(a);
  const score = after === null ? null : after <= target.budget ? 100 : Math.round(100 * target.budget / after);
  const result = {score, before, after, delta: null, verdict: "ineligible"};
  if (!allowed || a.length !== 6 || b.length !== 6 || c.length !== 12 || [...a,...c].includes(null)
    || [...base,...head,...calibration].some(s => s.completed !== head[0].completed)) return result;
  const threshold = Math.max(median(a) * 0.01, ...c.filter((_,i) => i % 2 === 0).map((v,i) => Math.abs(v - c[i*2+1])));
  const diffs = b.map((v,i) => v - a[i]);
  return {...result, delta: median(diffs), verdict: Math.max(...diffs) < -threshold ? "improved"
    : Math.min(...diffs) > threshold ? "regressed" : "inconclusive"};
}
export function projectScore(report) {
  const scores = report.workloads.map(w => evaluate(w).score);
  const complete = scores.filter(s => s !== null);
  return { covered: complete.length, total: scores.length,
    score: !report.setupError && complete.length && complete.length === scores.length ? Math.round(complete.reduce((a,b) => a+b,0)/scores.length) : null };
}
