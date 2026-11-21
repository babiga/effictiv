import Link from "next/link";
import { redirect } from "next/navigation";
import { GitForkIcon, PlusIcon } from "lucide-react";
import { DemoDashboard } from "@/components/demo-dashboard";
import { ProjectShell } from "@/components/project-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { currentAccount } from "@/lib/github/accounts";
import { listAccessibleProjects } from "@/lib/github/projects";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (process.env.EFFICTIV_BENCHMARK_MODE === "1" && !process.env.VERCEL) return <DemoDashboard benchmark />;
  const account = await currentAccount();
  if (!account) redirect("/login");

  const projects = await listAccessibleProjects(account.id).catch(() => null);
  return (
    <ProjectShell account={account}>
      <div className="flex flex-wrap items-start justify-between gap-4 pb-6">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Repositories</h1>
          <p className="mt-1 text-muted-foreground">Track GitHub Actions build outcomes and modeled energy.</p>
        </div>
        <Link className={buttonVariants()} href="/dashboard/import"><PlusIcon aria-hidden /> Import repository</Link>
      </div>
      {projects === null && (
        <Card>
          <CardContent className="space-y-3">
            <p role="alert">GitHub access couldn’t be checked. Refresh the page or reconnect GitHub.</p>
            <Link className={buttonVariants({ variant: "outline" })} href="/login?error=connection">Reconnect GitHub</Link>
          </CardContent>
        </Card>
      )}
      {projects?.length === 0 && (
        <Card>
          <CardContent className="space-y-2">
            <GitForkIcon className="size-5 text-muted-foreground" aria-hidden />
            <h2 className="font-medium">No accessible repositories</h2>
            <p className="text-muted-foreground">Import a GitHub repository to start collecting build results.</p>
          </CardContent>
        </Card>
      )}
      {!!projects?.length && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map(({ id, full_name, private: privateRepo, default_branch }) => (
            <li key={id}>
              <Link href={`/dashboard/projects/${id}`} className="block rounded-xl border bg-card p-4 hover:border-primary/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="break-all font-medium">{full_name}</span>
                  <Badge variant="outline">{privateRepo ? "Private" : "Public"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Default branch {default_branch}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ProjectShell>
  );
}
