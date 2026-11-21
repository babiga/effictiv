import { createHash } from "node:crypto";
import { z } from "zod";
import { pilotRepositoryId } from "../measurements/pilot.mjs";
import { resultSchema, scenarioKey } from "../measurements/schema.mjs";

export const comparisonPairCount = 6;
export const comparisonVisitCount = 30;
export const maxComparisonBytes = 4 * 1024 * 1024;
export const repositoryIdSchema = z.string().regex(/^[1-9]\d{0,18}$/)
  .refine((id) => id.length < 19 || id <= "9223372036854775807");
export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const commitSha = z.string().regex(/^[a-f0-9]{40}$/);
const attempt = z.int().positive().max(2_147_483_647);
const capture = z.strictObject({
  result: resultSchema,
  log: z.string().min(1).max(64 * 1024),
}).superRefine(({ result, log }, ctx) => {
  if (Buffer.byteLength(log) > 64 * 1024 || createHash("sha256").update(log).digest("hex") !== result.sourceLog.sha256) {
    ctx.addIssue({ code: "custom", path: ["log"], message: "Source log size or SHA-256 does not match." });
  }
});
const pair = z.strictObject({ baseline: capture.nullable(), candidate: capture.nullable() });
const scenario = z.strictObject({
  scenario: scenarioKey,
  calibration: z.array(pair).length(comparisonPairCount),
  comparison: z.array(pair).length(comparisonPairCount),
});

export const comparisonUploadSchema = z.strictObject({
  version: z.literal(1),
  repositoryId: z.literal(pilotRepositoryId),
  workflowRunId: repositoryIdSchema,
  attempt,
  pullRequest: attempt,
  baselineSha: commitSha,
  candidateSha: commitSha,
  runnerId: z.string().regex(/^[\w.-]{1,128}$/),
  scenarios: z.array(scenario).length(2),
}).superRefine((upload, ctx) => {
  const seenScenarios = new Set();
  const sourceIds = new Set();
  for (const [index, entry] of upload.scenarios.entries()) {
    if (seenScenarios.has(entry.scenario)) {
      ctx.addIssue({ code: "custom", path: ["scenarios", index], message: "Each dashboard scenario must appear once." });
    }
    seenScenarios.add(entry.scenario);
    for (const kind of ["calibration", "comparison"]) {
      for (const [slot, pair] of entry[kind].entries()) {
        for (const side of ["baseline", "candidate"]) {
          const result = pair[side]?.result;
          if (!result) continue;
          const expected = kind === "calibration" || side === "baseline" ? upload.baselineSha : upload.candidateSha;
          const path = ["scenarios", index, kind, slot, side];
          if (result.scenario !== entry.scenario || result.commitSha !== expected) {
            ctx.addIssue({ code: "custom", path, message: "The run does not match its assigned scenario and commit." });
          }
          if (result.sourceRunId && sourceIds.has(result.sourceRunId)) {
            ctx.addIssue({ code: "custom", path, message: "A collector run can occupy only one slot." });
          }
          if (result.sourceRunId) sourceIds.add(result.sourceRunId);
        }
      }
    }
  }
});
