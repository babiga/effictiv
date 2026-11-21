"use client";

import { useState } from "react";
import { DownloadIcon, RefreshCwIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMeasurementsPage } from "@/hooks/use-measurements-page";
import type { CiRunPage, CiRunSummary } from "@/lib/measurements/ci-types";
import { pilotRepositoryId, pilotRepositoryName } from "@/lib/measurements/pilot.mjs";

const endpoint = `/api/v1/projects/${pilotRepositoryId}/ci-runs`;
const energyFormat = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 6 });
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
const outcomeLabels = { success: "Passed", failure: "Failed", skipped: "Skipped" };

export function CiMeasurements() {
  const [search, setSearch] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);
  const prefix = search.trim();
  const validSearch = /^[a-f0-9]{0,40}$/i.test(prefix);
  const filters = new URLSearchParams(prefix ? { search: prefix } : {});
  const exportParams = new URLSearchParams(filters);
  exportParams.set("format", "csv");
  const cursor = cursors.at(-1);
  if (cursor) filters.set("cursor", cursor);
  const { page, error, loading, refresh } = useMeasurementsPage<CiRunPage>(validSearch ? `${endpoint}?${filters}` : null);

  return (
    <div className="flex flex-col gap-4 p-4 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl tracking-tight">CI builds</h2>
          <p className="text-sm text-muted-foreground">{pilotRepositoryName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!validSearch} onClick={refresh}><RefreshCwIcon /> Refresh</Button>
          {page?.runs.length ? (
            <a className={buttonVariants({ variant: "outline" })} href={`${endpoint}?${exportParams}`}>
              <DownloadIcon /> Export CSV
            </a>
          ) : <Button variant="outline" disabled><DownloadIcon /> Export CSV</Button>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Input className="sm:max-w-80" aria-label="Search by commit prefix" aria-invalid={!validSearch}
          aria-describedby={validSearch ? undefined : "ci-search-error"} maxLength={40} value={search}
          placeholder="Search by commit prefix" onChange={(event) => { setSearch(event.target.value); setCursors([]); }} />
        {!validSearch && <p id="ci-search-error" className="text-sm text-muted-foreground">Enter a hexadecimal commit prefix.</p>}
      </div>

      {validSearch && (
        <Card aria-busy={loading}>
          <CardContent>
            {loading && <p role="status" className="text-muted-foreground">Loading CI builds…</p>}
            {error && <div className="flex flex-wrap items-center gap-3">
              <p role="alert">CI builds are temporarily unavailable.</p>
              <Button variant="outline" onClick={refresh}>Retry</Button>
            </div>}
            {page?.runs.length === 0 && <p role="status" className="text-muted-foreground">
              {prefix ? "No CI builds match this commit." : "No CI builds imported yet."}
            </p>}
            {!!page?.runs.length && (
              <div className="overflow-x-auto">
                <table aria-label="CI build runs" className="w-full text-left text-xs">
                  <thead className="border-b text-muted-foreground">
                    <tr>{["Run (UTC)", "Build", "Modeled job energy", "Modeled energy per build", "Runner and phases", "Source"].map((name) => (
                      <th key={name} scope="col" className="p-2 font-medium">{name}</th>
                    ))}</tr>
                  </thead>
                  <tbody>{page.runs.map((run) => <CiRunRow key={run.id} run={run} />)}</tbody>
                </table>
              </div>
            )}
            {page && (cursors.length > 0 || page.nextCursor) && (
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" disabled={!cursors.length} onClick={() => setCursors(cursors.slice(0, -1))}>Previous</Button>
                <span className="text-xs text-muted-foreground">Page {cursors.length + 1}</span>
                <Button variant="outline" size="sm" disabled={!page.nextCursor} onClick={() => {
                  if (page.nextCursor) setCursors([...cursors, page.nextCursor]);
                }}>Next</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CiRunRow({ run }: { run: CiRunSummary }) {
  const runUrl = `https://github.com/${pilotRepositoryName}/actions/runs/${run.runId}/attempts/${run.attempt}`;
  return (
    <tr className="border-b align-top last:border-b-0">
      <th scope="row" className="min-w-32 p-2 font-medium">
        <div><time dateTime={run.finishedAt}>{dateFormat.format(new Date(run.finishedAt))}</time></div>
        <span title={run.commitSha} className="font-mono text-muted-foreground">{run.commitSha.slice(0, 8)}</span>
      </th>
      <td className="p-2">
        <Badge variant={run.buildOutcome === "failure" ? "destructive" : "secondary"}>{outcomeLabels[run.buildOutcome]}</Badge>
      </td>
      <td className="min-w-36 p-2">
        {run.jobWh === null ? <>
          <div>Unavailable</div>
          <div className="text-muted-foreground">{run.energyUnavailableReason}</div>
        </> : <div className="tabular-nums">{energyFormat.format(run.jobWh)} Wh</div>}
      </td>
      <td className="min-w-24 p-2 tabular-nums">{run.buildWh === null ? "—" : `${energyFormat.format(run.buildWh)} Wh/build`}</td>
      <td className="min-w-48 p-2">
        <div>{run.runner.image} · {run.runner.logicalCpus} vCPUs</div>
        <div className="text-muted-foreground">Eco CI {run.collector.version}</div>
        <details className="mt-1">
          <summary className="cursor-pointer">Phase details</summary>
          <p className="mt-1 text-muted-foreground">{run.boundary}</p>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            {run.phases.map((phase) => <li key={phase.command}>
              {phase.command} · {outcomeLabels[phase.outcome]}{phase.wattHours === null
                ? "" : ` · ${energyFormat.format(phase.wattHours)} Wh (${phase.joules} J)`}
            </li>)}
          </ul>
          {run.runner.cpuModel && <p className="mt-1 text-muted-foreground">Reported CPU {run.runner.cpuModel}</p>}
          <p className="mt-1 break-all text-muted-foreground">Model preset {run.collector.model}</p>
        </details>
      </td>
      <td className="whitespace-nowrap p-2">
        <a className="block underline underline-offset-2" href={run.artifactUrl} title={`SHA-256 ${run.artifactSha256}`} target="_blank" rel="noreferrer">Collector artifact</a>
        <a className="underline underline-offset-2" href={runUrl} target="_blank" rel="noreferrer">GitHub run</a>
      </td>
    </tr>
  );
}
