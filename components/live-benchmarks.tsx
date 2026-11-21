"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Comparison, ComparisonDetail, ComparisonPage, EvidencePair, Scenario, Verdict } from "@/lib/comparisons/types";
import { pilotRepositoryId, pilotRepositoryName } from "@/lib/measurements/pilot.mjs";

const scenarioNames: Record<Scenario, string> = {
  "dashboard-landing": "Dashboard landing",
  "dashboard-scroll": "Dashboard scroll",
};
const verdictNames: Record<Verdict, string> = {
  improved: "Improved",
  regressed: "Regressed",
  inconclusive: "Inconclusive",
  ineligible: "Ineligible",
};
const verdictStyles: Record<Verdict, string> = {
  improved: "border-emerald-500/30 text-emerald-500",
  regressed: "border-rose-500/30 text-rose-500",
  inconclusive: "text-muted-foreground",
  ineligible: "text-muted-foreground",
};

const repositoryUrl = `https://github.com/${pilotRepositoryName}`;
const listUrl = `/api/v1/projects/${pilotRepositoryId}/comparisons`;
const number = new Intl.NumberFormat("en", { maximumSignificantDigits: 6 });
const format = (value: number | null) => value === null ? "Unavailable" : number.format(value);

function Commits({ comparison }: { comparison: Comparison }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {([
        ["Baseline", comparison.baselineSha],
        ["Candidate", comparison.candidateSha],
      ] as const).map(([label, sha]) => (
        <div key={label} className="min-w-0">
          <dt className="text-muted-foreground">{label}</dt>
          <dd>
            <a className="break-all font-mono text-xs underline underline-offset-4" href={`${repositoryUrl}/commit/${sha}`}>
              {sha}
            </a>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ComparisonCard({ comparison, link }: { comparison: Comparison; link?: boolean }) {
  const metrics = comparison.metrics;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{scenarioNames[comparison.scenario]}</CardTitle>
          <Badge variant="outline" className={verdictStyles[comparison.verdict]}>{verdictNames[comparison.verdict]}</Badge>
        </div>
        <CardDescription>{comparison.reason}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Commits comparison={comparison} />
        {metrics && (
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div><dt className="text-muted-foreground">Baseline Wh/visit</dt><dd>{format(metrics.baselineWhPerVisit)}</dd></div>
            <div><dt className="text-muted-foreground">Candidate Wh/visit</dt><dd>{format(metrics.candidateWhPerVisit)}</dd></div>
            <div>
              <dt className="text-muted-foreground">Median paired delta</dt>
              <dd>{format(metrics.deltaWhPerVisit)} Wh/visit{metrics.deltaPercent !== null && ` (${format(metrics.deltaPercent)}%)`}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Paired interval</dt>
              <dd>{format(metrics.lowerWhPerVisit)} to {format(metrics.upperWhPerVisit)} Wh/visit</dd>
            </div>
          </dl>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Policy v{comparison.policyVersion}</span>
          <span>{comparison.pairCount} comparison pairs</span>
          <span>{comparison.calibrationPairCount} calibration pairs</span>
          {metrics && <span>Noise threshold ±{format(metrics.thresholdWhPerVisit)} Wh/visit</span>}
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <a className="underline underline-offset-4" href={`${repositoryUrl}/pull/${comparison.pullRequest}`}>PR #{comparison.pullRequest}</a>
          <a className="underline underline-offset-4" href={`${repositoryUrl}/actions/runs/${comparison.workflowRunId}/attempts/${comparison.attempt}`}>GitHub run</a>
          {link && <Link className="underline underline-offset-4" href={`/dashboard/comparisons/${comparison.id}`}>View evidence</Link>}
        </div>
      </CardContent>
    </Card>
  );
}

function RunEvidence({ run, label }: { run: EvidencePair["baseline"]; label: string }) {
  if (!run) return <span className="text-muted-foreground">Missing run</span>;
  return (
    <div className="space-y-1">
      <div>{run.completedVisits} completed, {run.failedVisits} failed</div>
      <div>{run.energyWhPerVisit === null ? "Energy unavailable" : `${format(run.energyWhPerVisit)} Wh/visit`}</div>
      <a className="underline underline-offset-4" href={run.sourceUrl}>{label} source log</a>
    </div>
  );
}

export function BenchmarkEvidence({ comparison }: { comparison: ComparisonDetail }) {
  return (
    <div className="space-y-4">
      <ComparisonCard comparison={comparison} />
      <Card>
        <CardHeader>
          <CardTitle>Source runs</CardTitle>
          <CardDescription>Runner {comparison.runnerId}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Repetition</TableHead><TableHead>Baseline</TableHead><TableHead>Candidate</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {comparison.pairs.map((pair) => {
                const label = `${pair.kind === "calibration" ? "Calibration" : "Comparison"} ${pair.ordinal}`;
                return (
                  <TableRow key={`${pair.kind}-${pair.ordinal}`}>
                    <TableCell>{label}</TableCell>
                    <TableCell><RunEvidence run={pair.baseline} label={`${label} baseline`} /></TableCell>
                    <TableCell><RunEvidence run={pair.candidate} label={`${label} candidate`} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

async function fetchComparisons(signal?: AbortSignal, cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const response = await fetch(`${listUrl}${query}`, { signal });
  if (!response.ok) throw new Error("Could not load comparisons.");
  return await response.json() as ComparisonPage;
}

export function LiveBenchmarks() {
  const [page, setPage] = useState<ComparisonPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchComparisons(controller.signal).then(setPage).catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [retry]);

  async function loadMore(cursor: string) {
    setLoadingMore(true);
    setFailed(false);
    try {
      const next = await fetchComparisons(undefined, cursor);
      setPage((current) => ({
        comparisons: [...(current?.comparisons ?? []), ...next.comparisons],
        nextCursor: next.nextCursor,
      }));
    } catch {
      setFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-4">
      {failed && <p role="alert" className="text-sm text-destructive">Could not load comparisons.</p>}
      {!page && !failed && <p role="status" className="text-sm text-muted-foreground">Loading comparisons…</p>}
      {!page && failed && <Button variant="outline" onClick={() => { setFailed(false); setRetry(retry + 1); }}>Retry</Button>}
      {page?.comparisons.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No comparisons yet</CardTitle>
            <CardDescription>Published dashboard benchmarks will appear here after they run in GitHub Actions.</CardDescription>
          </CardHeader>
        </Card>
      )}
      {page?.comparisons.map((comparison) => <ComparisonCard key={comparison.id} comparison={comparison} link />)}
      {page?.nextCursor && (
        <Button variant="outline" disabled={loadingMore} onClick={() => { if (page.nextCursor) void loadMore(page.nextCursor); }}>
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
