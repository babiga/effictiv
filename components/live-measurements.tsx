"use client";

import { useEffect, useState } from "react";
import { DownloadIcon, RefreshCwIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pilotRepositoryId, pilotRepositoryName } from "@/lib/measurements/pilot.mjs";
import type { RunPage, RunSummary } from "@/lib/measurements/types";

const endpoint = `/api/v1/projects/${pilotRepositoryId}/runs`;
const scenarios = { "dashboard-landing": "Dashboard landing", "dashboard-scroll": "Dashboard scroll" };
const energyFormat = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 6 });
const averageFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const startedAtFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
});

type FetchResult = { key: string; page: RunPage } | { key: string; error: true };

export function LiveMeasurements() {
  const [scenario, setScenario] = useState("all");
  const [search, setSearch] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<FetchResult>();

  const filters = new URLSearchParams();
  if (scenario !== "all") filters.set("scenario", scenario);
  if (search.trim()) filters.set("search", search.trim());
  const exportParams = new URLSearchParams(filters);
  exportParams.set("format", "csv");
  const cursor = cursors.at(-1);
  if (cursor) filters.set("cursor", cursor);
  const url = `${endpoint}?${filters}`;
  const key = `${url}#${refresh}`;
  const current = result?.key === key ? result : undefined;
  const page = current && "page" in current ? current.page : undefined;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Measurements request failed");
        const page: RunPage = await response.json();
        if (!controller.signal.aborted) setResult({ key, page });
      } catch {
        if (!controller.signal.aborted) setResult({ key, error: true });
      }
    }
    void load();
    return () => controller.abort();
  }, [url, key]);

  return (
    <div className="flex flex-col gap-4 p-4 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl tracking-tight">Measurements</h2>
          <p className="text-sm text-muted-foreground">{pilotRepositoryName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRefresh(refresh + 1)}>
            <RefreshCwIcon /> Refresh
          </Button>
          {page?.runs.length ? (
            <a className={buttonVariants({ variant: "outline" })} href={`${endpoint}?${exportParams}`}>
              <DownloadIcon /> Export CSV
            </a>
          ) : (
            <Button variant="outline" disabled><DownloadIcon /> Export CSV</Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          className="sm:max-w-80"
          aria-label="Search measurements"
          placeholder="Search by commit, collector, or scenario"
          maxLength={120}
          value={search}
          onChange={(event) => { setSearch(event.target.value); setCursors([]); }}
        />
        <Select value={scenario} onValueChange={(value) => { setScenario(value ?? "all"); setCursors([]); }}>
          <SelectTrigger aria-label="Filter by scenario" className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scenarios</SelectItem>
            {Object.entries(scenarios).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card aria-busy={!current}>
        <CardContent>
          {!current && <p role="status" className="text-muted-foreground">Loading measurements…</p>}
          {current && "error" in current && (
            <div className="flex flex-wrap items-center gap-3">
              <p role="alert">Measurements are temporarily unavailable.</p>
              <Button variant="outline" onClick={() => setRefresh(refresh + 1)}>Retry</Button>
            </div>
          )}
          {page?.runs.length === 0 && (
            <p role="status" className="text-muted-foreground">
              {search.trim() || scenario !== "all" ? "No runs match these filters." : "No measurements collected yet."}
            </p>
          )}
          {!!page?.runs.length && (
            <div className="overflow-x-auto">
              <table aria-label="Measurement runs" className="w-full text-left text-xs">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    {["Run (UTC)", "Collector", "Visits", "Energy", "Workload averages", "Source"].map((name) => (
                      <th key={name} scope="col" className="p-2 font-medium">{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{page.runs.map((run) => <MeasurementRow key={run.id} run={run} />)}</tbody>
              </table>
            </div>
          )}
          {page && (cursors.length > 0 || page.nextCursor) && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="outline" disabled={!cursors.length} onClick={() => setCursors(cursors.slice(0, -1))}>
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">Page {cursors.length + 1}</span>
              <Button variant="outline" disabled={!page.nextCursor} onClick={() => {
                if (page.nextCursor) setCursors([...cursors, page.nextCursor]);
              }}>
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MeasurementRow({ run }: { run: RunSummary }) {
  const scenario = scenarios[run.scenario as keyof typeof scenarios] ?? run.scenario;
  return (
    <tr className="border-b align-top last:border-b-0">
      <th scope="row" className="min-w-36 p-2 font-medium">
        <div>{scenario}</div>
        <time dateTime={run.startedAt} className="block text-muted-foreground">{startedAtFormat.format(new Date(run.startedAt))}</time>
        <span title={run.commitSha} className="font-mono">{run.commitSha.slice(0, 8)}</span>
        <span className="ml-2 text-muted-foreground">· v{run.revision}</span>
      </th>
      <td className="min-w-28 p-2">{run.collector} {run.collectorVersion}</td>
      <td className="min-w-26 p-2">
        <Badge variant={run.assertion === "passed" ? "secondary" : "destructive"}>{run.assertion === "passed" ? "Passed" : "Failed"}</Badge>
        <div className="mt-1 text-muted-foreground">{run.completedVisits} completed · {run.failedVisits} failed</div>
      </td>
      <td className="min-w-48 p-2">
        {run.energyWh === null ? (
          <>
            <span>Unavailable</span>
            <div className="text-muted-foreground">{run.energyUnavailableReason}</div>
          </>
        ) : (
          <>
            <div className="font-medium tabular-nums">{energyFormat.format(run.energyWh)} Wh</div>
            {run.energyWhPerVisit !== null && (
              <div className="tabular-nums text-muted-foreground">{energyFormat.format(run.energyWhPerVisit)} Wh/visit</div>
            )}
            <div className="text-muted-foreground">{run.energyCoverage}</div>
            <details className="mt-1">
              <summary className="cursor-pointer">Original readings</summary>
              <ul className="text-muted-foreground">
                {run.energyReadings.map(({ domain, value, unit }) => <li key={domain}>{domain} · {value} {unit}</li>)}
              </ul>
            </details>
          </>
        )}
      </td>
      <td className="min-w-32 p-2 tabular-nums text-muted-foreground">
        <div>{run.meanTimeToUsableMs !== null ? `${averageFormat.format(run.meanTimeToUsableMs)} ms to usable` : "—"}</div>
        {run.meanTransferredBytes !== null && <div>{averageFormat.format(run.meanTransferredBytes)} bytes</div>}
      </td>
      <td className="px-2 py-2 whitespace-nowrap">
        <a href={run.sourceUrl} title={`SHA-256 ${run.sourceSha256}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          Collector log
        </a>
      </td>
    </tr>
  );
}
