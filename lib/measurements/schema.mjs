import { z } from "zod";
import { pilotRepositoryId } from "./pilot.mjs";

const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const commit = z.string().regex(/^[a-f0-9]{40}$/);
const count = z.int().nonnegative();
const index = z.int().min(1).max(2_147_483_647);
const assertion = z.enum(["passed", "failed"]);
export const scenarioKey = z.enum(["dashboard-landing", "dashboard-scroll"]);

const collector = z.discriminatedUnion("name", [
  z.strictObject({ name: z.literal("Playwright"), version: z.literal("1.58.2") }),
  z.strictObject({
    name: z.literal("Green Metrics Tool"),
    version: z.literal("4.2"),
    commit: z.literal("7f11a4309dd1d26f5bb8e97e561ef3a65c1a61d2"),
  }),
]);

const visit = z.discriminatedUnion("assertion", [
  z.strictObject({
    assertion: z.literal("passed"),
    timeToUsableMs: count,
    timeToAssertionMs: count,
    transferredBytes: count,
  }).refine((value) => value.timeToAssertionMs >= value.timeToUsableMs),
  z.strictObject({ assertion: z.literal("failed"), reason: z.string().min(1).max(4000) }),
]);

const workload = z.strictObject({
  scenario: scenarioKey,
  revision: index,
  fixtureSha256: sha256,
  mockDataSha256: sha256,
  browserVersion: z.string().min(1).max(80),
  viewport: z.strictObject({ width: index, height: index }),
  cachePolicy: z.literal("fresh-browser-context-per-visit"),
  startedAt: z.iso.datetime({ precision: 3 }),
  finishedAt: z.iso.datetime({ precision: 3 }),
  assertion,
  completedVisits: count,
  failedVisits: count,
  visits: z.array(visit).min(1).max(999),
}).superRefine((value, ctx) => {
  const completed = value.visits.filter((sample) => sample.assertion === "passed").length;
  const failed = value.visits.length - completed;
  if (value.completedVisits !== completed || value.failedVisits !== failed) {
    ctx.addIssue({ code: "custom", path: ["visits"], message: "Visit counts do not match the samples" });
  }
  if (value.assertion !== (failed === 0 ? "passed" : "failed")) {
    ctx.addIssue({ code: "custom", path: ["assertion"], message: "Assertion does not match the visits" });
  }
  if (Date.parse(value.finishedAt) < Date.parse(value.startedAt)) {
    ctx.addIssue({ code: "custom", path: ["finishedAt"], message: "Finish precedes start" });
  }
});

export const raplMetric = "cpu_energy_rapl_msr_component";
const phaseFields = { metric: z.literal(raplMetric), phase: z.literal("Dashboard visits") };

const energy = z.discriminatedUnion("status", [
  z.strictObject({
    ...phaseFields,
    status: z.literal("available"),
    phaseDurationUs: z.int().positive().nullable(),
    coverage: z.literal("Host CPU packages, including Chromium and Next.js CPU activity"),
    readings: z.array(z.strictObject({
      domain: z.string().regex(/^Package_\d{1,2}$/),
      value: z.number().nonnegative().max(Number.MAX_SAFE_INTEGER),
      unit: z.enum(["uJ", "J", "Wh"]),
    })).min(1).max(64).refine(
      (rows) => new Set(rows.map(({ domain }) => domain)).size === rows.length,
      { message: "Each CPU package must appear once" },
    ),
  }),
  z.strictObject({
    ...phaseFields,
    status: z.literal("unavailable"),
    readings: z.tuple([]),
    reason: z.string().min(1).max(400),
  }),
]);

export const resultSchema = z.strictObject({
  schemaVersion: z.literal(1),
  commitSha: commit,
  scenario: scenarioKey,
  functionalUnit: z.literal("one completed dashboard visit"),
  assertion,
  hardware: z.strictObject({
    architecture: z.string().min(1).max(80),
    cpuModel: z.string().min(1).max(240).nullable(),
    logicalCpusAvailable: index,
    kernelRelease: z.string().min(1).max(120),
    raplMsrDevicePresent: z.boolean(),
  }),
  collector,
  sourceRunId: z.uuid().nullable(),
  sourceLog: z.strictObject({ name: z.enum(["landing.log", "scroll.log"]), sha256 }),
  workload,
  energy,
}).superRefine((value, ctx) => {
  if (value.workload.scenario !== value.scenario || value.sourceLog.name !== `${value.scenario.replace("dashboard-", "")}.log`) {
    ctx.addIssue({ code: "custom", path: ["scenario"], message: "The workload and log must match the scenario" });
  }
  if (value.assertion === "passed" && value.workload.assertion !== "passed") {
    ctx.addIssue({ code: "custom", path: ["assertion"], message: "A failed workload cannot pass" });
  }
  if (value.energy.status === "available" && (
    value.collector.name !== "Green Metrics Tool" || !value.sourceRunId || !value.hardware.raplMsrDevicePresent
  )) {
    ctx.addIssue({ code: "custom", path: ["energy"], message: "Energy readings require a GMT run with a RAPL device" });
  }
});

export const uploadSchema = z.strictObject({
  repositoryId: z.literal(pilotRepositoryId),
  attempt: index,
  repetition: index,
  artifactUrl: z.string().max(2048).pipe(z.url({ protocol: /^https$/ })).refine((url) => {
    const parsed = new URL(url);
    return !parsed.username && !parsed.password;
  }, "Artifact URLs must not include credentials"),
  result: resultSchema,
});
