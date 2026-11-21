import { z } from "zod";
import { pilotRepositoryId } from "./pilot.mjs";
import { toWh } from "./energy.mjs";

const id = z.string().regex(/^[1-9]\d{0,19}$/);
const repositoryId = z.string().regex(/^[1-9]\d{0,18}$/)
  .refine((value) => value.length < 19 || value <= "9223372036854775807");
const outcome = z.enum(["success", "failure"]);
const stepOutcome = outcome.or(z.literal("skipped"));
const maxArtifactLength = 256 * 1024;
const timestamp = z.iso.datetime({ precision: 3 });
const phaseLabel = z.enum(["npm ci", "npm run build"]);
const decimal = z.string().max(40).regex(/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i)
  .refine((value) => Number.isFinite(Number(value)));
const nonNegativeDecimal = decimal.refine((value) => Number(value) >= 0);

function parseJson(text, ctx) {
  try {
    return JSON.parse(text);
  } catch {
    ctx.addIssue({ code: "custom", message: "Expected valid JSON" });
    return z.NEVER;
  }
}

const laps = z.string().max(maxArtifactLength).transform(parseJson).pipe(z.object({
  repository: z.string().min(1).max(300),
  run_id: id,
  steps: z.array(z.object({
    label: phaseLabel,
    energy_joules: nonNegativeDecimal,
    time: nonNegativeDecimal,
  })).min(1).max(2),
}));

const totalSamples = z.string().max(maxArtifactLength)
  .transform((text) => text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))
  .pipe(z.array(decimal).min(1))
  .transform((samples) => samples.reduce((total, sample) => total + Number(sample), 0))
  .pipe(z.number().nonnegative());

export const ecoCiArtifactSchema = z.string().min(1).max(maxArtifactLength)
  .transform(parseJson)
  .pipe(z.strictObject({
    schemaVersion: z.literal(1),
    repositoryId,
    repository: z.string().max(220).regex(/^[\w.-]+\/[\w.-]+$/),
    commitSha: z.string().regex(/^[a-f0-9]{40}$/),
    runId: id,
    attempt: z.int().min(1).max(2_147_483_647),
    job: z.literal("build"),
    jobId: id.nullable(),
    runner: z.strictObject({
      image: z.literal("ubuntu-24.04"),
      imageVersion: z.string().min(1).max(100).nullable(),
      architecture: z.string().min(1).max(32),
      cpuModel: z.string().min(1).max(240).nullable(),
      logicalCpus: z.int().min(1).max(1024),
    }),
    collector: z.strictObject({
      version: z.literal("5.3.0"),
      commit: z.literal("782dd4a31bc426a6ae26a7b08d89af454b10ffc0"),
      model: z.literal("github_EPYC_7763_4_CPU_shared.sh"),
    }),
    startedAt: timestamp.nullable(),
    finishedAt: timestamp,
    outcomes: z.strictObject({ install: outcome, build: stepOutcome }),
    collectorOutcomes: z.strictObject({ initialize: stepOutcome, install: stepOutcome, build: stepOutcome }),
    lapData: laps.nullable(),
    totalSamplesJoules: totalSamples.nullable(),
  }).superRefine((artifact, ctx) => {
    const { startedAt, finishedAt, outcomes, lapData, runId } = artifact;
    if (startedAt && Date.parse(startedAt) > Date.parse(finishedAt)) {
      ctx.addIssue({ code: "custom", path: ["startedAt"], message: "Capture start must precede its finish" });
    }
    const buildAttempted = outcomes.build !== "skipped";
    if (buildAttempted !== (outcomes.install === "success")) {
      ctx.addIssue({ code: "custom", path: ["outcomes"], message: "Build may run only after a successful install" });
    }
    if (lapData && (lapData.repository.toLowerCase() !== encodeURIComponent(artifact.repository).toLowerCase()
      || lapData.run_id !== runId
      || (lapData.steps.length === 2 && lapData.steps[0].label !== "npm ci")
      || new Set(lapData.steps.map(({ label }) => label)).size !== lapData.steps.length
      || (outcomes.build === "skipped" && lapData.steps.some(({ label }) => label === "npm run build")))) {
      ctx.addIssue({ code: "custom", path: ["lapData"], message: "Collector laps must match the run and attempted phases" });
    }
  }));

export const ecoCiUploadSchema = z.strictObject({
  repositoryId: z.literal(pilotRepositoryId),
  artifactUrl: z.string().max(2048).pipe(z.url({ protocol: /^https$/ })).refine((value) => {
    const url = new URL(value);
    return !url.username && !url.password;
  }, "Artifact URLs must not include credentials"),
  artifactSha256: z.string().regex(/^[a-f0-9]{64}$/),
  artifact: z.string().min(1).max(maxArtifactLength),
});

export const ecoCiBoundary = "Modeled GitHub runner VM during dependency install and build, including Eco CI overhead in the job total";

/** @param {z.output<typeof ecoCiArtifactSchema>} artifact */
export function summarizeEcoCiArtifact(artifact) {
  const { schemaVersion, jobId, runner, collector, startedAt, lapData, totalSamplesJoules, outcomes, collectorOutcomes } = artifact;
  const usableModel = runner.architecture === "x64" && runner.logicalCpus === 4;
  const initialized = usableModel && Boolean(startedAt) && collectorOutcomes.initialize === "success";
  const install = initialized && collectorOutcomes.install === "success"
    ? lapData?.steps.find(({ label }) => label === "npm ci") : undefined;
  // Eco CI restarts its lap timer only after a lap with samples.
  const build = install && collectorOutcomes.build === "success"
    ? lapData?.steps.find(({ label }) => label === "npm run build") : undefined;
  const jobJoules = install && (outcomes.build === "skipped" || build) ? totalSamplesJoules : null;
  const phases = [
    { command: "npm ci", outcome: outcomes.install, sample: install },
    { command: "npm run build", outcome: outcomes.build, sample: build },
  ].map(({ command, outcome, sample }) => ({
    command,
    outcome,
    joules: sample?.energy_joules ?? null,
    wattHours: sample ? toWh(Number(sample.energy_joules), "J") : null,
    durationSeconds: sample ? Number(sample.time) : null,
  }));

  return {
    schemaVersion, jobId, runner, collector, phases, buildOutcome: outcomes.build,
    boundary: ecoCiBoundary,
    jobJoules,
    jobWh: jobJoules === null ? null : toWh(jobJoules, "J"),
    buildWh: build && outcomes.build === "success" ? toWh(Number(build.energy_joules), "J") : null,
    energyUnavailableReason: jobJoules !== null ? null : usableModel
      ? "Eco CI did not capture every attempted phase and the interval total."
      : "This runner does not match the four-vCPU x64 model preset.",
  };
}
