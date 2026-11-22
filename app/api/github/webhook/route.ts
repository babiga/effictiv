import { createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { providerId, repositorySchema } from "@/lib/github/client";
import { githubSetting } from "@/lib/github/config";
import { setInstallationAccess } from "@/lib/github/projects";
import { enqueueCiRuns, processCiQueue } from "@/lib/ci/queue";
import { supportedRun, workflowRunSchema } from "@/lib/ci/workflow";

export const maxDuration = 60;

const installation = z.object({ id: providerId });
const runEvent = z.object({
  action: z.string(),
  installation,
  repository: repositorySchema,
  workflow_run: workflowRunSchema,
});
const installationEvent = z.object({
  action: z.string(),
  installation,
  repositories_removed: z.array(z.object({ id: providerId })).optional(),
  repositories_added: z.array(z.object({ id: providerId })).optional(),
});

export async function POST(request: Request) {
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  if (!/^sha256=[a-f0-9]{64}$/.test(signature)) return new Response(null, { status: 401 });
  const body = Buffer.from(await request.arrayBuffer());
  if (body.length > 2 * 1024 * 1024) return new Response(null, { status: 413 });
  const expected = createHmac("sha256", githubSetting("GITHUB_APP_WEBHOOK_SECRET")).update(body).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"))) return new Response(null, { status: 401 });

  const event = request.headers.get("x-github-event");
  if (!event || !["workflow_run", "installation", "installation_repositories"].includes(event)) {
    return new Response(null, { status: 204 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body.toString("utf8"));
  } catch {
    return new Response(null, { status: 400 });
  }

  if (event === "workflow_run") {
    const parsed = runEvent.safeParse(payload);
    if (!parsed.success) return new Response(null, { status: 422 });
    const { action, repository, installation, workflow_run: run } = parsed.data;
    if (action === "completed" && supportedRun(run, repository.id, repository.default_branch)) {
      await enqueueCiRuns(repository.id, installation.id, [run]);
      after(() => processCiQueue({ repositoryId: repository.id, runId: run.id, attempt: run.run_attempt }));
    }
  } else {
    const parsed = installationEvent.safeParse(payload);
    if (!parsed.success) return new Response(null, { status: 422 });
    const { action, installation, repositories_added, repositories_removed } = parsed.data;
    if (event === "installation" && ["deleted", "suspend", "unsuspend"].includes(action)) {
      await setInstallationAccess(installation.id, action !== "unsuspend");
    }
    if (event === "installation_repositories" && (action === "removed" || action === "added")) {
      const ids = (action === "removed" ? repositories_removed : repositories_added)?.map(({ id }) => id) ?? [];
      if (ids.length) await setInstallationAccess(installation.id, action === "removed", ids);
    }
  }
  return new Response(null, { status: 202 });
}
