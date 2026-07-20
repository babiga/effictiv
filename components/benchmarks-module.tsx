"use client";

import * as React from "react";
import { FlameIcon, TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockBenchmarks } from "@/lib/mockData";

export function BenchmarksModule() {
  const [selectedType, setSelectedType] = React.useState<string>("all");

  const filtered = selectedType === "all"
    ? mockBenchmarks
    : mockBenchmarks.filter((b) => b.type === selectedType);

  const types = ["all", "commit", "deployment", "version", "branch"];

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "improved":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "regression":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case "improved":
        return <TrendingDownIcon className="h-3 w-3 text-emerald-500" />;
      case "regression":
        return <TrendingUpIcon className="h-3 w-3 text-rose-500" />;
      default:
        return <MinusIcon className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getDelta = (after: number, before: number) => {
    if (!before) return 0;
    return Math.round(((after - before) / before) * 100);
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 text-xs">
      <div>
        <h2 className="text-xl tracking-tight">Software Energy Benchmarks</h2>
        <p className="text-xs text-muted-foreground">
          Compare commits, branches, or deployments to prevent energy regressions
        </p>
      </div>

      <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border/40 text-xs self-start">
        {types.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-3 py-1 rounded-md capitalize font-medium transition-colors ${
              selectedType === type
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((bench) => (
          <Card key={bench.id} className="bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[9px] uppercase font-semibold bg-muted text-muted-foreground">
                  {bench.type}
                </Badge>
                <Badge variant="outline" className={`text-[9px] uppercase font-semibold ${getVerdictBadge(bench.verdict)}`}>
                  {bench.verdict}
                </Badge>
                <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                  {new Date(bench.timestamp).toLocaleDateString()}
                </span>
              </div>
              <CardTitle className="text-base leading-tight">{bench.name}</CardTitle>
              <CardDescription className="text-[10px] font-mono text-muted-foreground">
                {bench.application}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bench.baselineMetrics && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border rounded-lg bg-muted/20">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">
                      Baseline
                    </div>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Energy</span>
                        <span className="font-semibold">{bench.baselineMetrics.energy} Wh</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Carbon</span>
                        <span>{bench.baselineMetrics.carbon} g</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Efficiency</span>
                        <span>{bench.baselineMetrics.efficiency}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CPU</span>
                        <span>{bench.baselineMetrics.cpu}%</span>
                      </div>
                    </div>
                  </div>
                  <div className={`p-3 border rounded-lg ${
                    bench.verdict === "regression"
                      ? "border-rose-500/30 bg-rose-500/[0.005]"
                      : bench.verdict === "improved"
                        ? "border-emerald-500/30 bg-emerald-500/[0.005]"
                        : "bg-muted/20"
                  }`}>
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">
                      Current
                    </div>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Energy</span>
                        <span className={`font-semibold ${
                          bench.verdict === "regression" ? "text-rose-500" : bench.verdict === "improved" ? "text-emerald-500" : ""
                        }`}>
                          {getDelta(bench.metrics.energy, bench.baselineMetrics.energy) > 0 ? "+" : ""}
                          {getDelta(bench.metrics.energy, bench.baselineMetrics.energy)}% ({bench.metrics.energy} Wh)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Carbon</span>
                        <span>{bench.metrics.carbon} g</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Efficiency</span>
                        <span>{bench.metrics.efficiency}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CPU</span>
                        <span>{bench.metrics.cpu}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {bench.verdict === "regression" && (
                <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg flex items-start gap-2.5">
                  <FlameIcon className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-foreground font-semibold">Energy regression detected</div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      This change increases energy consumption by{" "}
                      <strong className="text-rose-500">
                        {Math.abs(getDelta(bench.metrics.energy, bench.baselineMetrics?.energy || 0))}%
                      </strong>
                      . Review the changes before merging.
                    </p>
                  </div>
                </div>
              )}

              {bench.verdict === "improved" && (
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg flex items-start gap-2.5">
                  <TrendingDownIcon className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-foreground font-semibold">Energy improvement</div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      This change reduces energy consumption by{" "}
                      <strong className="text-emerald-500">
                        {Math.abs(getDelta(bench.metrics.energy, bench.baselineMetrics?.energy || 0))}%
                      </strong>
                      . Great work for sustainability!
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
