"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ZapIcon,
  TreePineIcon,
  SparklesIcon,
  LeafIcon,
  AlertTriangleIcon,
  PlayIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  mockApplications,
  mockMeasurements,
  mockRecommendations,
  mockAlerts,
  mockHotspots,
  mockGreenScoreHistory,
} from "@/lib/mockData";
import { EnergyTrendChart } from "@/components/charts/energy-trend-chart";
import { EnergyBreakdownChart } from "@/components/charts/energy-breakdown-chart";
import { HotspotTable } from "@/components/tables/hotspot-table";

interface DashboardModuleProps {
  timeRange: string;
  environment: string;
  appliedCount: number;
  onNavigate: (tab: string) => void;
}

export function DashboardModule({
  timeRange,
  environment,
  appliedCount,
  onNavigate,
}: DashboardModuleProps) {
  const filteredApps = mockApplications.filter(
    (app) => environment === "all" || app.environment === environment,
  );

  const totalEnergy = filteredApps.reduce((sum, app) => sum + app.energyUsagekWh, 0);
  const totalCarbon = filteredApps.reduce((sum, app) => sum + app.carbonEmissionsGrams, 0);
  const avgEfficiency = Math.round(
    filteredApps.length > 0
      ? filteredApps.reduce((sum, app) => {
          const scoreMap = { A: 95, B: 85, C: 75, D: 60, E: 45, F: 30 };
          return sum + scoreMap[app.energyScore];
        }, 0) / filteredApps.length
      : 80,
  );

  const currentGreenScore = mockGreenScoreHistory[mockGreenScoreHistory.length - 1]?.score || 78;
  const previousGreenScore = mockGreenScoreHistory[mockGreenScoreHistory.length - 8]?.score || 72;

  const activeRecommendations = mockRecommendations.filter((r) => r.status === "Active");
  const totalEnergyReduction = activeRecommendations.reduce((sum, r) => sum + r.estimatedSavingskWh, 0);
  const totalCarbonReduction = activeRecommendations.reduce((sum, r) => sum + r.estimatedSavingsCarbon, 0);

  const treesEquivalent = (totalCarbon / 21000).toFixed(1);

  const generateTrendData = () => {
    const points = timeRange === "7d" ? 7 : timeRange === "30d" ? 15 : 30;
    return Array.from({ length: points }).map((_, idx) => {
      const day = points - idx;
      const date = new Date();
      date.setDate(date.getDate() - day);
      const baseEnergy =
        environment === "production"
          ? 1400
          : environment === "staging"
            ? 400
            : environment === "development"
              ? 50
              : 1850;
      const offset =
        Math.sin(idx) * (baseEnergy * 0.15) +
        Math.random() * (baseEnergy * 0.05);
      return {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        energy: Math.round(baseEnergy + offset),
        carbon: Math.round((baseEnergy + offset) * 0.38),
      };
    });
  };

  const trendData = generateTrendData();

  const languageData = [
    { name: "Python", value: Math.round(filteredApps.filter((a) => a.language === "Python").reduce((s, a) => s + a.energyUsagekWh, 0)), color: "#eab308" },
    { name: "Java", value: Math.round(filteredApps.filter((a) => a.language === "Java").reduce((s, a) => s + a.energyUsagekWh, 0)), color: "#ef4444" },
    { name: "TypeScript", value: Math.round(filteredApps.filter((a) => a.language === "TypeScript").reduce((s, a) => s + a.energyUsagekWh, 0)), color: "#3b82f6" },
    { name: "Go", value: Math.round(filteredApps.filter((a) => a.language === "Go").reduce((s, a) => s + a.energyUsagekWh, 0)), color: "#06b6d4" },
    { name: "Rust", value: Math.round(filteredApps.filter((a) => a.language === "Rust").reduce((s, a) => s + a.energyUsagekWh, 0)), color: "#f97316" },
  ].filter((d) => d.value > 0);

  const infraData = [
    { name: "AWS EC2 / EKS", value: Math.round(totalEnergy * 0.62), color: "#10b981" },
    { name: "GCP Kubernetes", value: Math.round(totalEnergy * 0.23), color: "#3b82f6" },
    { name: "On-Prem / Hybrid", value: Math.round(totalEnergy * 0.15), color: "#6366f1" },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-card shadow-sm hover:border-muted-foreground/30 transition-all duration-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Green Score</span>
              <LeafIcon className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums tracking-tight text-emerald-500">
              {currentGreenScore}
              <span className="text-xs font-normal text-muted-foreground ml-1">/100</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <SparklesIcon className="h-3.5 w-3.5" />
              <span>+{currentGreenScore - previousGreenScore} points this week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm hover:border-muted-foreground/30 transition-all duration-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Energy Usage</span>
              <ZapIcon className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums tracking-tight">
              {totalEnergy.toLocaleString(undefined, { maximumFractionDigits: 1 })}{" "}
              <span className="text-xs font-normal text-muted-foreground">kWh</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <SparklesIcon className="h-3.5 w-3.5" />
              <span>-4.2% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm hover:border-muted-foreground/30 transition-all duration-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Carbon Footprint</span>
              <TreePineIcon className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums tracking-tight">
              {(totalCarbon / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}{" "}
              <span className="text-xs font-normal text-muted-foreground">kg CO₂e</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TreePineIcon className="h-3 w-3 text-emerald-500" />
              <span>≈ {treesEquivalent} trees absorbing CO₂ for a year</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm hover:border-muted-foreground/30 transition-all duration-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Efficiency Score</span>
              <ZapIcon className="h-4 w-4 text-yellow-500" />
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums tracking-tight flex items-baseline gap-1">
              <span>{avgEfficiency}</span>
              <span className="text-xs font-normal text-muted-foreground">/100</span>
              <Badge
                variant="outline"
                className="ml-2 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] py-0 px-1.5"
              >
                Grade {avgEfficiency >= 90 ? "A" : avgEfficiency >= 80 ? "B" : avgEfficiency >= 70 ? "C" : "D"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <SparklesIcon className="h-3.5 w-3.5" />
              <span>+2 points increase</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/[0.03] dark:bg-emerald-500/[0.02] border-emerald-500/20 shadow-sm hover:border-emerald-500/40 transition-all duration-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span>Energy Reduction Potential</span>
              <ZapIcon className="h-4 w-4 text-emerald-500 animate-pulse" />
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              {totalEnergyReduction.toLocaleString()}{" "}
              <span className="text-xs font-normal">kWh/mo</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-xs text-emerald-700/80 dark:text-emerald-400/80 font-medium flex items-center justify-between">
              <span>{activeRecommendations.length} optimizations available</span>
              <button
                onClick={() => onNavigate("recommendations")}
                className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline leading-none"
              >
                Optimize →
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base font-semibold">Energy & Carbon Trend</CardTitle>
              <CardDescription className="text-xs">
                Software power consumption and grid carbon intensity over time
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
            >
              Live Telemetry
            </Badge>
          </CardHeader>
          <CardContent className="px-2 pt-2">
            <EnergyTrendChart data={trendData} height={280} showCarbon />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Energy by Language</CardTitle>
              <CardDescription className="text-xs">
                Which programming languages consume the most energy
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <EnergyBreakdownChart data={languageData} />
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="text-base font-semibold">Infrastructure Share</CardTitle>
              <CardDescription className="text-xs">Energy consumption by provider</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0 flex flex-row items-center justify-between">
              <div className="relative size-24 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={infraData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {infraData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-1.5 ml-4 flex-1">
                {infraData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-semibold tabular-nums ml-2">
                      {Math.round((item.value / totalEnergy) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="pt-0 pb-4 justify-center">
              <Button
                variant="link"
                size="sm"
                onClick={() => onNavigate("infrastructure")}
                className="text-xs h-7 gap-1"
              >
                View Infrastructure Details
                <PlayIcon className="h-2 w-2" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Hotspots + Alerts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Energy Hotspots</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("analytics")}
                className="text-xs text-muted-foreground hover:text-foreground h-8"
              >
                View all
              </Button>
            </div>
            <CardDescription className="text-xs">
              Endpoints consuming the most energy across your services
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <HotspotTable hotspots={mockHotspots} maxRows={5} />
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Active Alerts</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("alerts")}
                className="text-xs text-muted-foreground hover:text-foreground h-8"
              >
                View all alerts
              </Button>
            </div>
            <CardDescription className="text-xs">
              Carbon regressions and energy threshold violations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            {mockAlerts
              .filter((a) => a.status === "Active")
              .map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                >
                  <AlertTriangleIcon className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{alert.title}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 px-1 border-destructive/20 text-destructive bg-destructive/10 uppercase"
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {alert.description}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                      <span>
                        App: <strong className="text-foreground">{alert.application}</strong>
                      </span>
                      <span>
                        Value: <strong className="text-foreground">{alert.value}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              ))}

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mt-2">
              <div className="flex items-center gap-2 mb-1.5">
                <SparklesIcon className="h-4 w-4 text-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-foreground">
                  AI Insight: Carbon Savings Potential
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                We detected that <strong className="text-foreground">data-pipeline</strong> staging
                runs are running on standard x86 instances during high carbon intensity periods.
                Transitioning to ARM architecture could save up to{" "}
                <span className="text-emerald-500">75,600 Wh</span> and prevent{" "}
                <strong className="text-foreground">28.7 kg of CO₂e</strong> carbon output.
              </p>
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigate("insights")}
                  className="text-[10px] h-6 px-2 text-emerald-500 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                >
                  Investigate Hotspots
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Measurements */}
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Energy Measurements</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("measurements")}
              className="text-xs text-muted-foreground hover:text-foreground h-8"
            >
              View history log
            </Button>
          </div>
          <CardDescription className="text-xs">
            Granular measurements from Kubernetes (Kepler) and CodeCarbon agents
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground font-semibold">
                  <th className="py-2 pl-1">Timestamp</th>
                  <th className="py-2">Application</th>
                  <th className="py-2">Service</th>
                  <th className="py-2 text-right">Energy (Wh)</th>
                  <th className="py-2 text-right">Carbon (gCO₂e)</th>
                  <th className="py-2 text-right">CPU %</th>
                  <th className="py-2 text-right">Instance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {mockMeasurements.slice(0, 5).map((m) => (
                  <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-2 pl-1 font-mono text-[10px] text-muted-foreground">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2 font-medium">{m.application}</td>
                    <td className="py-2 text-muted-foreground">{m.service}</td>
                    <td className="py-2 text-right font-mono tabular-nums font-semibold text-emerald-500">
                      {m.energyWh} Wh
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums text-muted-foreground">
                      {Math.round(m.energyWh * m.carbonIntensity / 1000)} g
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">{m.cpuPercent}%</td>
                    <td className="py-2 text-right text-muted-foreground">{m.machineType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
