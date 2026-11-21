import { NextResponse } from "next/server";
import { z } from "zod";
import { accountGitHubToken, currentAccount } from "@/lib/github/accounts";
import { findInstalledRepository, GitHubError, githubId } from "@/lib/github/client";
import { appOrigin, noStore, sameOrigin } from "@/lib/github/config";
import { importProject } from "@/lib/github/projects";

const input = z.object({ installationId: githubId, repositoryId: githubId });

function redirect(path: string) {
  return NextResponse.redirect(new URL(path, appOrigin()), { status: 303, headers: noStore });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403, headers: noStore });
  const account = await currentAccount();
  if (!account) return redirect("/login");

  const form = await request.formData().catch(() => null);
  const parsed = input.safeParse(form && Object.fromEntries(form));
  if (!parsed.success) return redirect("/dashboard/import?error=invalid");

  const { installationId, repositoryId } = parsed.data;
  try {
    const token = await accountGitHubToken(account.id);
    const repository = await findInstalledRepository(token, installationId, repositoryId);
    if (!repository) return redirect("/dashboard/import?error=access");
    await importProject(account.id, repository);
    return redirect(`/dashboard/projects/${repositoryId}`);
  } catch (error) {
    if (error instanceof GitHubError && error.status === 401) return redirect("/login?error=connection");
    console.error("GitHub repository import failed", error instanceof Error ? error.name : "unknown");
    return redirect("/dashboard/import?error=unavailable");
  }
}
