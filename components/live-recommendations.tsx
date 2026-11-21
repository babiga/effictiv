"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pilotRepositoryId, pilotRepositoryName } from "@/lib/measurements/pilot.mjs";
import type { Recommendation, RecommendationStatus, ScenarioBudgets, ScenarioEvidence, Verification } from "@/lib/recommendations/types";

const labels: Record<RecommendationStatus, string> = {
  suggested: "Suggested",
  implemented: "Implemented",
  verified: "Verified",
  inconclusive: "Inconclusive",
  dismissed: "Dismissed",
};
const repositoryUrl = `https://github.com/${pilotRepositoryName}`;
const number = new Intl.NumberFormat("en", { maximumSignificantDigits: 6 });
const format = (value: number | null) => value === null ? "Unavailable" : number.format(value);

function Budget({ budgets }: { budgets: ScenarioBudgets }) {
  return (
    <p className="text-sm text-muted-foreground">
      p95 latency may increase by up to {budgets["dashboard-landing"]} ms on landing and {budgets["dashboard-scroll"]} ms through scroll.
    </p>
  );
}

function PathEvidence({ label, path }: { label: string; path: ScenarioEvidence }) {
  const { energy, latency } = path;
  return (
    <section className="space-y-2 rounded-md border p-3" aria-label={`${label} evidence`}>
      <h4 className="font-medium">
        <Link className="underline underline-offset-4" href={`/dashboard/comparisons/${path.comparisonId}`}>
          {label} comparison
        </Link>
        <span className="ml-2 capitalize text-muted-foreground">{path.verdict}</span>
      </h4>
      <p className="text-muted-foreground">{path.reason}</p>
      <dl className="space-y-2">
        <div>
          <dt className="text-muted-foreground">CPU package energy</dt>
          <dd>
            {energy ? `${format(energy.baselineWhPerVisit)} → ${format(energy.candidateWhPerVisit)} Wh/visit` : "Unavailable"}
          </dd>
          {energy && (
            <dd>
              Median paired change {format(energy.deltaWhPerVisit)} Wh/visit. Interval {format(energy.lowerWhPerVisit)} to{" "}
              {format(energy.upperWhPerVisit)} Wh/visit. Threshold ±{format(energy.thresholdWhPerVisit)} Wh/visit.
            </dd>
          )}
        </div>
        <div>
          <dt className="text-muted-foreground">
            {latency.metric === "time_to_usable" ? "P95 time to usable" : "P95 time to scroll assertion"}
          </dt>
          <dd>
            {format(latency.baselineP95Ms)} → {format(latency.candidateP95Ms)} ms.
            {latency.deltaMs !== null && ` Change ${format(latency.deltaMs)} ms.`} Budget +{latency.budgetMs} ms.
          </dd>
        </div>
      </dl>
    </section>
  );
}

function VerificationEvidence({ verification }: { verification: Verification }) {
  return (
    <div className="space-y-3">
      {verification.reasons.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {verification.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        <PathEvidence label="Landing" path={verification.landing} />
        <PathEvidence label="Scroll" path={verification.scroll} />
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const { title, hypothesis, status, history, implementation, budgets, policyVersion } = recommendation;
  const latestVerification = history.find((event) => event.verification);
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{title}</CardTitle>
          <Badge variant="outline" className={status === "verified" ? "border-emerald-500/30 text-emerald-500" : ""}>
            {labels[status]}
          </Badge>
        </div>
        <CardDescription>{hypothesis}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Budget budgets={budgets} />
        <p className="text-xs text-muted-foreground">Verification policy v{policyVersion}</p>
        {implementation && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <a className="underline underline-offset-4" href={`${repositoryUrl}/pull/${implementation.pullRequest}`}>
              PR #{implementation.pullRequest}
            </a>
            <a className="underline underline-offset-4" href={`${repositoryUrl}/commit/${implementation.baselineSha}`}>
              Baseline {implementation.baselineSha.slice(0, 12)}
            </a>
            <a className="underline underline-offset-4" href={`${repositoryUrl}/commit/${implementation.implementationSha}`}>
              Implementation {implementation.implementationSha.slice(0, 12)}
            </a>
          </div>
        )}
        {status === "implemented" && <p>Awaiting measured verification on both dashboard paths.</p>}
        {latestVerification?.verification && (
          <section className="space-y-2">
            <h3 className="font-medium">Latest verification</h3>
            <VerificationEvidence verification={latestVerification.verification} />
          </section>
        )}
        {history.length > 0 && (
          <details className="space-y-2">
            <summary className="cursor-pointer font-medium">Transition history</summary>
            <ol className="space-y-2">
              {history.map((event) => (
                <li key={event.id} className="space-y-2 border-t pt-2">
                  <p>
                    {labels[event.status]} · <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
                  </p>
                  {event.verification && event.id !== latestVerification?.id && (
                    <VerificationEvidence verification={event.verification} />
                  )}
                </li>
              ))}
            </ol>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

export function LiveRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/v1/projects/${pilotRepositoryId}/recommendations`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load recommendations.");
        const result: { recommendations: Recommendation[] } = await response.json();
        setRecommendations(result.recommendations);
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [retry]);

  if (failed) {
    return (
      <div className="space-y-2">
        <p role="alert" className="text-sm text-destructive">Could not load recommendations.</p>
        <Button variant="outline" onClick={() => { setFailed(false); setRetry((value) => value + 1); }}>Retry</Button>
      </div>
    );
  }
  if (!recommendations) return <p role="status" className="text-sm text-muted-foreground">Loading recommendations…</p>;
  if (recommendations.length === 0) return <p className="text-sm text-muted-foreground">No recommendations yet.</p>;
  return <div className="space-y-4">{recommendations.map((item) => <RecommendationCard key={item.slug} recommendation={item} />)}</div>;
}
