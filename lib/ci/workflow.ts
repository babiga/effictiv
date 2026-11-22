import "server-only";

import { z } from "zod";
import { githubJson, GitHubError, providerId } from "@/lib/github/client";

export const workflowFile = "effictiv-energy.yml";
export const efficiencyFile = "effictiv-workloads.yml";
export const efficiencyPath = `.github/workflows/${efficiencyFile}`;
export const workflowPath = `.github/workflows/${workflowFile}`;
export const commitSha = z.string().regex(/^[a-f0-9]{40}$/);

export const workflowRunSchema = z.object({
  id: providerId,
  run_attempt: z.number().int().positive().max(2_147_483_647),
  event: z.string(),
  path: z.string(),
  status: z.string(),
  conclusion: z.string().nullable(),
  head_sha: commitSha,
  head_branch: z.string().nullable(),
  head_repository: z.object({ id: providerId }).nullable(),
});

type WorkflowRun = z.output<typeof workflowRunSchema>;

export function supportedRun(run: WorkflowRun, repositoryId: string, branch: string) {
  if (run.path === efficiencyPath) {
    return run.status === "completed" && run.head_repository?.id === repositoryId && run.conclusion === "success"
      && (run.event === "pull_request" || (run.head_branch === branch && ["push","workflow_dispatch"].includes(run.event)));
  }
  return run.status === "completed" && run.head_repository?.id === repositoryId && run.head_branch === branch
    && ["push", "workflow_dispatch"].includes(run.event) && ["success", "failure"].includes(run.conclusion ?? "")
    && run.path === workflowPath;
}

export async function recentWorkflowRuns(token: string, repository: string, repositoryId: string, branch: string) {
  async function list(file: string) {
    const query = new URLSearchParams({ status: "completed", ...(file === workflowFile ? {branch} : {}), per_page: "20" });
    try {
      const result = await githubJson(`/repos/${repository}/actions/workflows/${file}/runs?${query}`, token,
        z.object({ workflow_runs: z.array(workflowRunSchema) }));
      return result.workflow_runs.filter((run) => supportedRun(run, repositoryId, branch));
    } catch (error) {
      if (error instanceof GitHubError && error.status === 404) return null;
      throw error;
    }
  }
  const [build, workloads] = await Promise.all([list(workflowFile), list(efficiencyFile)]);
  return build || workloads ? [...(build ?? []), ...(workloads ?? [])] : null;
}
