import { z } from "zod";

const commitSha = z.string().regex(/^[a-f0-9]{40}$/);
export const recommendationSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);

export const recommendationEventSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("implement"),
    pullRequest: z.int().positive().max(2_147_483_647),
    baselineSha: commitSha,
    implementationSha: commitSha,
  }).refine(({ baselineSha, implementationSha }) => baselineSha !== implementationSha, {
    message: "The implementation and baseline commits must be different.",
  }),
  z.strictObject({
    type: z.literal("verify"),
    landingComparisonId: z.uuid(),
    scrollComparisonId: z.uuid(),
  }).refine(({ landingComparisonId, scrollComparisonId }) => landingComparisonId !== scrollComparisonId, {
    message: "Provide a distinct comparison for each dashboard path.",
  }),
  z.strictObject({ type: z.literal("dismiss") }),
]);
