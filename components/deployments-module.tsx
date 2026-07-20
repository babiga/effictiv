"use client";

import * as React from "react";
import {
  GitCommitIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  ZapIcon,
  TreePineIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockDeployments } from "@/lib/mockData";
import { DeploymentTimeline } from "@/components/tables/deployment-timeline";

export function DeploymentsModule() {
  const [selectedApp, setSelectedApp] = React.useState<string>("all");

  const filtered = selectedApp === "all"
    ? mockDeployments
    : mockDeployments.filter((d) => d.application === selectedApp);

  const uniqueApps = Array.from(new Set(mockDeployments.map((d) => d.application)));

  const improved = filtered.filter((d) => d.status === "improved").length;
  const regressed = filtered.filter((d) => d.status === "regression").length;
  const neutral = filtered.filter((d) => d.status === "neutral").length;

  const avgEnergyChange = filtered.length > 0
    ? Math.round(
        filtered.reduce((s, d) => {
          const delta = d.energyBefore > 0 ? ((d.energyAfter - d.energyBefore) / d.energyBefore) * 100 : 0;
          return s + delta;
        }, 0) / filtered.length,
      )
    : 0;

  const bestDeployment = filtered.reduce(
    (best, d) => {
      const delta = d.energyBefore > 0 ? d.energyAfter - d.energyBefore : 0;
      return delta < best.delta ? { ...d, delta } : best;
    },
    { delta: Infinity, version: "N/A", application: "N/A" } as any,
  );

  const worstDeployment = filtered.reduce(
    (worst, d) => {
      const delta = d.energyBefore > 0 ? d.energyAfter - d.energyBefore : 0;
      return delta > worst.delta ? { ...d, delta } : worst;
    },
    { delta: -Infinity, version: "N/A", application: "N/A" } as any,
  );

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 text-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl tracking-tight">Deployment Energy Impact</h2>
          <p className="text-xs text-muted-foreground">
            Track how each deployment affects your software&apos;s energy consumption and carbon footprint
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border/40 text-xs self-start md:self-auto">
          <button
            onClick={() => setSelectedApp("all")}
            className={`px-3 py-1 rounded-md capitalize font-medium transition-colors ${
              selectedApp === "all"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Apps
          </button>
          {uniqueApps.map((app) => (
            <button
              key={app}
              onClick={() => setSelectedApp(app)}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                selectedApp === app
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {app}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-semibold text-muted-foreground">
              Total Deployments
            </CardDescription>
            <CardTitle className="text-xl tabular-nums">{filtered.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 text-[10px]">
              <span className="text-emerald-500">{improved} improved</span>
              <span className="text-rose-500">{regressed} regressed</span>
              <span className="text-muted-foreground">{neutral} neutral</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-muted-foreground">
              <ZapIcon className="h-3.5 w-3.5 text-emerald-500" />
              Avg Energy Change
            </CardDescription>
            <CardTitle className={`text-xl tabular-nums ${avgEnergyChange <= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {avgEnergyChange > 0 ? "+" : ""}{avgEnergyChange}%
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-emerald-500">
              <TrendingDownIcon className="h-3.5 w-3.5" />
              Best Deployment
            </CardDescription>
            <CardTitle className="text-sm font-semibold truncate">
              {bestDeployment.version}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-[10px] text-emerald-500">
              {bestDeployment.application} · {bestDeployment.delta} Wh
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-rose-500">
              <TrendingUpIcon className="h-3.5 w-3.5" />
              Worst Deployment
            </CardDescription>
            <CardTitle className="text-sm font-semibold truncate">
              {worstDeployment.version}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-[10px] text-rose-500">
              {worstDeployment.application} · +{worstDeployment.delta} Wh
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Deployment Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Deployment Timeline</CardTitle>
          <CardDescription className="text-xs">
            Chronological view of deployments and their energy impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeploymentTimeline deployments={filtered} />
        </CardContent>
      </Card>
    </div>
  );
}
