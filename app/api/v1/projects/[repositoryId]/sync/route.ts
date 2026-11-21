import { after, NextResponse } from "next/server";
import { enqueueCiRuns, processCiQueue } from "@/lib/ci/queue";
import { recentWorkflowRuns } from "@/lib/ci/workflow";
import { githubId, installationToken } from "@/lib/github/client";
import { appOrigin, noStore, sameOrigin } from "@/lib/github/config";
import { currentProject } from "@/lib/github/projects";

export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ repositoryId: string }> }) {
  if (!sameOrigin(request)) return new Response(null, { status: 403, headers: noStore });
  const id = githubId.safeParse((await params).repositoryId);
  if (!id.success) return new Response(null, { status: 404, headers: noStore });

  const redirect = (status: string) => NextResponse.redirect(
    new URL(`/dashboard/projects/${id.data}?sync=${status}`, appOrigin()), { status: 303, headers: noStore },
  );
  try {
    const project = await currentProject(id.data);
    if (!project) return new Response(null, { status: 404, headers: noStore });
    const token = await installationToken(project.installationId, project.id);
    const runs = await recentWorkflowRuns(token, project.full_name, project.id, project.default_branch);
    if (!runs) return redirect("setup");
    if (!runs.length) return redirect("waiting");
    await enqueueCiRuns(project.id, project.installationId, runs, true);
    after(() => processCiQueue({ repositoryId: project.id }, 8));
    return redirect("requested");
  } catch (error) {
    console.error("GitHub CI sync request failed", error instanceof Error ? error.name : "unknown");
    return redirect("unavailable");
  }
}
