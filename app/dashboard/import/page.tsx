import Link from "next/link";
import { redirect } from "next/navigation";
import { GitBranchIcon, LockKeyholeIcon, PlusIcon } from "lucide-react";
import { ProjectShell } from "@/components/project-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { accountGitHubToken, currentAccount } from "@/lib/github/accounts";
import { GitHubError, listInstallationRepositories, listInstallations } from "@/lib/github/client";
import { projectMemberships } from "@/lib/github/projects";

const errors: Record<string, string> = {
  access: "This repository is unavailable to your GitHub account. Check your installation access and try again.",
  invalid: "Choose a repository to import.",
  unavailable: "GitHub or Effictiv is temporarily unavailable. Try again.",
};

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ installation?: string; page?: string; error?: string }>;
}) {
  const account = await currentAccount();
  if (!account) redirect("/login");
  const query = await searchParams;
  const page = typeof query.page === "string" && /^[1-9]\d{0,5}$/.test(query.page) ? Number(query.page) : 1;
  const slug = process.env.GITHUB_APP_SLUG;
  let data;
  try {
    const token = await accountGitHubToken(account.id);
    const [installations, memberships] = await Promise.all([listInstallations(token), projectMemberships(account.id)]);
    const active = installations.find(({ id }) => id === query.installation) ?? installations[0];
    const repositories = active ? await listInstallationRepositories(token, active.id, page) : [];
    data = { installations, active, repositories, imported: new Set(memberships.filter(({ installationId }) => installationId === active?.id).map(({ repositoryId }) => repositoryId)) };
  } catch (error) {
    if (error instanceof GitHubError && error.status === 401) redirect("/login?error=connection");
    console.error("GitHub repository list failed", error instanceof Error ? error.name : "unknown");
  }

  return (
    <ProjectShell account={account}>
      <div className="flex flex-wrap items-start justify-between gap-4 pb-6">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Import a repository</h1>
          <p className="mt-1 text-muted-foreground">Choose a repository from a GitHub account where Effictiv is installed.</p>
        </div>
        {slug && (
          <a href={`https://github.com/apps/${encodeURIComponent(slug)}/installations/new`} className={buttonVariants({ variant: "outline" })}>
            <GitBranchIcon aria-hidden /> Manage GitHub access
          </a>
        )}
      </div>
      {query.error && Object.hasOwn(errors, query.error) && (
        <p className="mb-4 text-sm text-destructive" role="alert">{errors[query.error]}</p>
      )}
      {!data && <p role="alert">GitHub repositories couldn’t be loaded. Refresh to try again.</p>}
      {data && !data.active && (
        <Card><CardContent className="text-muted-foreground">
          Install the Effictiv GitHub App and grant access to your repositories, then return here to import one.
        </CardContent></Card>
      )}
      {data?.active && (
        <div className="space-y-4">
          {data.installations.length > 1 && (
            <nav aria-label="GitHub installations" className="flex flex-wrap gap-2">
              {data.installations.map((installation) => (
                <Link key={installation.id} href={`?installation=${installation.id}`}
                  aria-current={installation.id === data.active?.id ? "page" : undefined}
                  className={buttonVariants({ variant: installation.id === data.active?.id ? "default" : "outline" })}>
                  {installation.account?.login ?? `Installation ${installation.id}`}
                </Link>
              ))}
            </nav>
          )}
          <Card>
            <CardContent>
              {data.repositories.length === 0 && <p className="text-muted-foreground">No repositories on this page.</p>}
              <ul className="divide-y">
                {data.repositories.map(({ id, full_name, private: privateRepo }) => (
                  <li key={id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                    <span className="flex items-center gap-2 break-all">
                      {privateRepo && <LockKeyholeIcon className="size-4 shrink-0 text-muted-foreground" aria-label="Private repository" />}
                      {full_name}
                    </span>
                    {data.imported.has(id) ? (
                      <Link href={`/dashboard/projects/${id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Open</Link>
                    ) : (
                      <form action="/api/v1/projects" method="post">
                        <input type="hidden" name="installationId" value={data.active?.id} />
                        <input type="hidden" name="repositoryId" value={id} />
                        <Button type="submit" size="sm" aria-label={`Import ${full_name}`}><PlusIcon aria-hidden /> Import</Button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          {(page > 1 || data.repositories.length === 100) && (
            <nav aria-label="Repository pages" className="flex items-center justify-end gap-3 text-sm">
              {page > 1 && <Link href={`?installation=${data.active.id}&page=${page - 1}`} className={buttonVariants({ variant: "outline" })}>Previous</Link>}
              <span>Page {page}</span>
              {data.repositories.length === 100 && <Link href={`?installation=${data.active.id}&page=${page + 1}`} className={buttonVariants({ variant: "outline" })}>Next</Link>}
            </nav>
          )}
        </div>
      )}
    </ProjectShell>
  );
}
