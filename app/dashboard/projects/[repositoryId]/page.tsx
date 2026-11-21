import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DownloadIcon, GitBranchIcon, RefreshCwIcon } from "lucide-react";
import { CiMeasurements } from "@/components/ci-measurements";
import { ProjectShell } from "@/components/project-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ciSyncStatus } from "@/lib/ci/queue";
import { workflowFile, workflowPath } from "@/lib/ci/workflow";
import { currentAccount } from "@/lib/github/accounts";
import { githubId } from "@/lib/github/client";
import { accessibleProject } from "@/lib/github/projects";
import { ciSummary } from "@/lib/measurements/ci-store";

const syncMessages: Record<string, string> = {
  setup: "GitHub couldn’t find the Effictiv workflow. Commit both setup files to the default branch.",
  waiting: "GitHub has no completed Effictiv workflow runs on the default branch yet.",
  requested: "Sync requested. Results will appear as GitHub artifacts are imported.",
  unavailable: "Sync is temporarily unavailable. Try again.",
};
const statusMessages = {
  pending: "A result is queued for import.",
  running: "Importing a GitHub Actions result.",
  imported: "GitHub Actions results are up to date.",
  skipped: "A GitHub Actions run is missing an importable artifact.",
  failed: "A GitHub Actions result couldn’t be imported.",
};
const numberFormat = new Intl.NumberFormat("en", { maximumSignificantDigits: 6 });

function energy(value: number | null, unit: string) {
  return value === null ? "Unavailable" : `${numberFormat.format(value)} ${unit}`;
}

export default async function ProjectPage({
  params, searchParams,
}: {
  params: Promise<{ repositoryId: string }>;
  searchParams: Promise<{ sync?: string }>;
}) {
  const account = await currentAccount();
  if (!account) redirect("/login");
  const id = githubId.safeParse((await params).repositoryId);
  if (!id.success) notFound();

  let project;
  try {
    project = await accessibleProject(account.id, id.data);
  } catch (error) {
    console.error("Project access check failed", error instanceof Error ? error.name : "unknown");
    return (
      <ProjectShell account={account}>
        <p role="alert">Repository access couldn’t be checked with GitHub. Refresh to try again.</p>
      </ProjectShell>
    );
  }
  if (!project) notFound();

  const [{ sync }, summary, status] = await Promise.all([searchParams, ciSummary(project.id), ciSyncStatus(project.id)]);
  const base = `/dashboard/projects/${project.id}`;

  return (
    <ProjectShell account={account}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link className="text-sm text-muted-foreground underline underline-offset-4" href="/dashboard">All repositories</Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="break-all text-2xl font-medium tracking-tight">{project.full_name}</h1>
            <Badge variant="outline">{project.private ? "Private" : "Public"}</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">Default branch {project.default_branch}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`https://github.com/${project.full_name}/actions`} target="_blank" rel="noreferrer"
            className={buttonVariants({ variant: "outline" })}><GitBranchIcon aria-hidden /> GitHub Actions</a>
          <form action={`/api/v1/projects/${project.id}/sync`} method="post">
            <Button type="submit"><RefreshCwIcon aria-hidden /> Sync now</Button>
          </form>
        </div>
      </div>

      <section aria-label="Sync status" className="my-5 rounded-lg border bg-card p-4 text-sm" role="status">
        <p>{status ? (status.message ?? statusMessages[status.status]) : "Waiting for the first GitHub Actions result."}</p>
        {sync && Object.hasOwn(syncMessages, sync) && <p className="mt-1 text-muted-foreground">{syncMessages[sync]}</p>}
      </section>

      <section aria-label="All-time CI summary" className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader><CardDescription>Build runs</CardDescription><CardTitle>{numberFormat.format(summary.runs)}</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">All imported attempts</CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription>Total modeled job energy</CardDescription><CardTitle>{energy(summary.totalJobWh, "Wh")}</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">{numberFormat.format(summary.measuredRuns)} runs with a modeled job total</CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription>Average modeled build energy</CardDescription><CardTitle>{energy(summary.averageBuildWh, "Wh/build")}</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Successful builds with a valid reading</CardContent>
        </Card>
      </section>
      <p className="py-4 text-sm text-muted-foreground">CI carbon emissions are unavailable because GitHub doesn’t provide a runner grid factor.</p>

      <Card className="mb-3">
        <CardContent>
          <details open={summary.runs === 0}>
            <summary className="cursor-pointer font-medium">Set up CI measurements</summary>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Save the workflow as <code>{workflowPath}</code> and the capture script as <code>scripts/capture-eco-ci.mjs</code>.</li>
              <li>Commit both files to <code>{project.default_branch}</code>. The workflow runs <code>npm ci</code> and <code>npm run build</code> from the repository root.</li>
              <li>In GitHub Actions, run <strong>Effictiv CI energy</strong> on the default branch or wait for the next push. Effictiv imports the result automatically.</li>
            </ol>
            <p className="mt-3 text-sm text-muted-foreground">Modeled energy requires an Ubuntu 24.04 x64 runner with four vCPUs. Standard private runners report build outcomes.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`${base}/setup/${workflowFile}`} className={buttonVariants({ variant: "outline" })}><DownloadIcon aria-hidden /> Workflow file</a>
              <a href={`${base}/setup/capture-eco-ci.mjs`} className={buttonVariants({ variant: "outline" })}><DownloadIcon aria-hidden /> Capture script</a>
            </div>
          </details>
        </CardContent>
      </Card>
      <CiMeasurements repositoryId={project.id} repositoryName={project.full_name} scope="project" />
    </ProjectShell>
  );
}
