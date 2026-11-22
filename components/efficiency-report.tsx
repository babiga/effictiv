import Link from "next/link";
import { ArrowDownRight, Leaf } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { median, metricUnits, projectScore } from "@/collector/model.mjs";
import { carbonMethod, insights, treeMethod } from "@/collector/insights.mjs";
import { efficiencyFile } from "@/lib/ci/workflow";
import { readReport, reportHistory, scoreHistory, type EfficiencyReport } from "@/lib/efficiency/store";

const number = (value: number | null | undefined) =>
  value == null ? "—" : new Intl.NumberFormat("en", { maximumSignificantDigits: 4 }).format(value);
type Workload = EfficiencyReport["workloads"][number];
const metricNames = {
  transferBytes: "Transferred bytes",
  cpuSeconds: "CPU time",
  elapsedMs: "Elapsed time",
  peakRssBytes: "Peak memory",
  energyWh: "Energy",
};
const docs = "https://github.com/babiga/effictiv/blob/main/plan/workloads.md";
function WorkloadCard({ w, volume, period }: { w: Workload; volume: number; period: string | null }) {
  const t = w.target;
  const data = insights(w, volume);
  const p95 = median(w.head.flatMap((s) => (s.p95Ms === undefined ? [] : [s.p95Ms])));
  const budgetMs = t.maxP95Ms;
  const guardFailed =
    budgetMs !== undefined && w.head.some((s) => s.p95Ms === undefined || s.p95Ms > budgetMs);
  return (
    <Card>
      <CardHeader>
        <CardDescription>
          {t.kind} · {t.unit}
        </CardDescription>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          {t.id}
          <span className="rounded-full border px-3 py-1 text-sm font-medium">{data.verdict}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Target score</p>
            <strong>{number(data.score)} / 100</strong>
          </div>
          <div>
            <p className="text-muted-foreground">{metricNames[t.metric]} · base → head</p>
            <strong>
              {number(data.before)} → {number(data.after)} {metricUnits[t.metric]}
            </strong>
          </div>
          <div>
            <p className="text-muted-foreground">
              Budget per {number(t.per)} {t.unit}
            </p>
            <strong>
              {number(t.budget)} {metricUnits[t.metric]}
            </strong>
          </div>
        </div>
        {w.error && <p role="status">{w.error}</p>}
        {!!guardFailed && <p>The candidate exceeded its p95 latency budget of {number(t.maxP95Ms)} ms.</p>}
        {p95 !== null && <p>Candidate median run p95 · {number(p95)} ms</p>}
        {data.after === null && !w.error && !guardFailed && (
          <p>The primary metric is unavailable for this workload.</p>
        )}
        {data.saved !== null && (
          <div className="rounded-lg border border-emerald-500/30 p-3">
            <strong className="flex items-center gap-2">
              <ArrowDownRight size={16} />
              {number(data.saved)} {data.savedUnit} less for {number(volume)} {t.unit}
            </strong>
            <p className="text-muted-foreground">
              {period
                ? `Projection using the supplied ${period} volume`
                : "Projection at the benchmarked workload mix"}
            </p>
            {data.grams !== null && <p>{number(data.grams)} gCO₂e less estimated web delivery emissions.</p>}
            {data.seedlings !== null && (
              <a className="underline" href={treeMethod}>
                {number(data.seedlings)} urban seedlings’ estimated uptake over ten years · EPA
              </a>
            )}
          </div>
        )}
        {data.advice.map((a, i) => (
          <div className="rounded-lg bg-muted/40 p-3" key={i}>
            <span className="font-medium capitalize">{a.status}</span> ·{" "}
            <code className="break-all">{a.path}</code>
            <p>{a.detail}</p>
            {a.potentialBytes > 0 && <p>Lighthouse estimate · {number(a.potentialBytes)} B</p>}
          </div>
        ))}
        <details>
          <summary className="cursor-pointer">Measurement evidence</summary>
          <div className="mt-2 space-y-2">
            <p>
              {w.calibration.length} control runs · {w.base.length} baseline runs · {w.head.length} candidate
              runs
            </p>
            {data.threshold !== null && (
              <p>
                Paired change {number(data.lower)} to {number(data.upper)} {metricUnits[t.metric]} · noise
                threshold ±{number(data.threshold)} {metricUnits[t.metric]}
              </p>
            )}
            {w.head.length > 0 && <p>{number(w.head[0].completed)} completed per candidate run</p>}
            {(["transferBytes", "cpuSeconds", "elapsedMs", "peakRssBytes", "energyWh"] as const).map(
              (key) => {
                const readings = w.head.flatMap((s) => (s[key] === undefined ? [] : [s[key]]));
                return (
                  readings.length > 0 && (
                    <p key={key}>
                      {metricNames[key]} per run (median) · {number(median(readings))} {metricUnits[key]}
                    </p>
                  )
                );
              },
            )}
            <p>{w.energySource ?? "Device energy unavailable"}</p>
            {w.headDelivery && (
              <>
                <p>
                  Cold visit · {w.headDelivery.requests} requests · LCP {number(w.headDelivery.lcpMs)} ms
                </p>
                {w.headDelivery.groups.map((g) => (
                  <p key={g.category}>
                    {g.category} · {number(g.bytes)} B
                  </p>
                ))}
                {w.headDelivery.resources.map((a, i) => (
                  <p className="break-all" key={i}>
                    {a.path} · {number(a.bytes)} B
                  </p>
                ))}
                <p>
                  {number(data.gramsPerVisit)} gCO₂e per visit · {carbonMethod}
                </p>
              </>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

export async function EfficiencyPanel({
  repositoryId,
  name,
  selected,
  units,
  month,
  workload,
}: {
  repositoryId: string;
  name: string;
  selected?: string;
  units?: string;
  month?: string;
  workload?: string;
}) {
  const history = await reportHistory(repositoryId);
  const key = (r: { runId: string; attempt: number }) => `${r.runId}-${r.attempt}`;
  const selectedRun = history.find((r) => key(r) === selected) ?? history[0];
  const item = selectedRun && (await readReport(repositoryId, selectedRun.runId, selectedRun.attempt));
  const report = item?.report;
  const score = report && projectScore(report);
  const trend = report ? await scoreHistory(report) : [];
  const base = `/dashboard/projects/${repositoryId}`;
  const monthValid = !!month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const validVolume = monthValid && !!units && /^[1-9]\d{0,11}$/.test(units);
  // Volume belongs to one unit. Never apply page visits to an unrelated API or batch workload.
  const volumeId = workload ?? report?.workloads[0]?.target.id;
  return (
    <section aria-label="Workload efficiency" className="mb-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Workload efficiency</h2>
        <a href={base + "/setup/" + efficiencyFile} className={buttonVariants({ variant: "outline" })}>
          Download workflow
        </a>
      </div>
      {!report || !score ? (
        <Card>
          <CardContent className="space-y-2">
            <p>
              Save the workflow as <code>.github/workflows/{efficiencyFile}</code> on your default branch. Its
              first run checks tracked file sizes and duplicates.
            </p>
            <a className="underline" href={docs}>
              Configure a page, API or command benchmark
            </a>
          </CardContent>
        </Card>
      ) : (
        <>
          <form className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">
              Comparison
              <select
                className="rounded border bg-background p-2"
                name="report"
                defaultValue={key(selectedRun)}
              >
                {history.map((r) => (
                  <option key={key(r)} value={key(r)}>
                    {r.base?.slice(0, 7) ?? "Initial"} → {r.commit.slice(0, 7)} · {key(r)}
                  </option>
                ))}
              </select>
            </label>
            {report.workloads.length > 0 && (
              <>
                <label className="grid gap-1 text-sm">
                  Usage workload
                  <select
                    name="workload"
                    className="rounded border bg-background p-2"
                    defaultValue={volumeId}
                  >
                    {report.workloads.map((w) => (
                      <option key={w.target.id}>{w.target.id}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  Usage month
                  <input type="month" className="rounded border p-1" name="month" defaultValue={month} />
                </label>
                <label className="grid gap-1 text-sm">
                  Completed units
                  <input
                    className="w-32 rounded border p-1"
                    min="1"
                    max="999999999999"
                    type="number"
                    name="units"
                    defaultValue={units}
                  />
                </label>
              </>
            )}
            <button className={buttonVariants({ variant: "outline" })}>Show report</button>
            <a
              className="self-center text-sm underline"
              href={`https://github.com/${name}/actions/workflows/${efficiencyFile}`}
            >
              Compare another pair
            </a>
          </form>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Project target score</CardDescription>
                <CardTitle className="flex items-center gap-2">
                  <Leaf size={18} />
                  {number(score.score)} / 100
                </CardTitle>
              </CardHeader>
              <CardContent>
                {score.covered}/{score.total} workloads scored
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Tracked files</CardDescription>
                <CardTitle>{number(report.inventory.files)}</CardTitle>
              </CardHeader>
              <CardContent>{number(report.inventory.bytes)} B on disk</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Repository byte change</CardDescription>
                <CardTitle>
                  {report.baselineInventory
                    ? number(report.inventory.bytes - report.baselineInventory.bytes) + " B"
                    : "First scan"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a className="underline" href={item.url}>
                  Source artifact
                </a>
              </CardContent>
            </Card>
          </div>
          {trend.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Target score history</CardTitle>
                <CardDescription>Matching workload configuration and runner</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="flex flex-wrap items-end gap-4">
                  {trend.map((point) => (
                    <li key={key(point)}>
                      <Link
                        className="grid gap-1 text-xs"
                        href={base + "?report=" + key(point)}
                        aria-label={`Commit ${point.commit.slice(0, 7)}, score ${point.score ?? "unavailable"}`}
                      >
                        <span>{number(point.score)}</span>
                        <span className="relative block h-12 w-9 rounded-sm bg-muted">
                          {point.score !== null && (
                            <span
                              className="absolute inset-x-0 bottom-0 rounded-sm bg-emerald-500"
                              style={{ height: point.score + "%" }}
                            />
                          )}
                        </span>
                        <code>{point.commit.slice(0, 7)}</code>
                      </Link>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
          {report.setupError && <p role="status">{report.setupError}</p>}
          {!report.workloads.length && (
            <a className="underline" href={docs}>
              Add a workload to measure runtime efficiency
            </a>
          )}
          {report.workloads.map((w) => (
            <WorkloadCard
              key={w.target.id}
              w={w}
              volume={validVolume && volumeId === w.target.id ? Number(units) : 1000}
              period={validVolume && volumeId === w.target.id ? month! : null}
            />
          ))}
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer">Repository files and duplicates</summary>
            {report.changes.map((a) => (
              <p className="mt-2 break-all text-sm" key={"delta-" + a.path}>
                {a.path} · {number(a.before)} → {number(a.after)} B
              </p>
            ))}
            {report.inventory.largest.map((a) => (
              <p className="mt-2 break-all text-sm" key={a.path}>
                {a.path} · {number(a.bytes)} B {a.width && a.height ? `· ${a.width} × ${a.height} px` : ""}
              </p>
            ))}
            {report.inventory.duplicates.map((d, i) => (
              <p className="mt-2 break-all text-sm" key={i}>
                Review {d.copies} identical files · {number(d.redundantBytes)} duplicate B ·{" "}
                {d.paths.join(", ")}
              </p>
            ))}
          </details>
          <p className="text-xs text-muted-foreground">
            {report.runner} ·{" "}
            <Link className="underline" href={`https://github.com/${name}/actions/runs/${report.runId}`}>
              Actions run
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
