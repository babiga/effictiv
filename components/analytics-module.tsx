"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { ZapIcon, TreePineIcon, GaugeIcon, ActivityIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockApplications, mockMeasurements, mockHotspots, mockDeployments } from "@/lib/mockData";
import { ResourceDistributionChart } from "@/components/charts/resource-distribution-chart";
import { HotspotTable } from "@/components/tables/hotspot-table";

export function AnalyticsModule() {
  const totalEnergy = mockApplications.reduce((s, a) => s + a.energyUsagekWh, 0);
  const totalCarbon = mockApplications.reduce((s, a) => s + a.carbonEmissionsGrams, 0);
  const avgCarbonIntensity = Math.round(
    mockMeasurements.reduce((s, m) => s + m.carbonIntensity, 0) / mockMeasurements.length,
  );
  const avgEfficiency = Math.round(
    mockApplications.reduce((s, a) => {
      const scoreMap: Record<string, number> = { A: 95, B: 85, C: 75, D: 60, E: 45, F: 30 };
      return s + scoreMap[a.energyScore];
    }, 0) / mockApplications.length,
  );

  const languageStats = [
    { language: "Rust", energy: 85, carbon: 32.4, efficiency: 95 },
    { language: "Go", energy: 124, carbon: 47.3, efficiency: 92 },
    { language: "TypeScript", energy: 223, carbon: 84.8, efficiency: 84 },
    { language: "Java", energy: 2450, carbon: 931, efficiency: 30 },
    { language: "Python", energy: 2313, carbon: 879, efficiency: 62 },
  ];

  const deploymentImpact = mockDeployments.slice(0, 6).map((d) => ({
    name: d.version,
    before: d.energyBefore,
    after: d.energyAfter,
    delta: d.energyAfter - d.energyBefore,
  }));

  const resourceData = [
    { name: "CPU", value: Math.round(totalEnergy * 0.58), color: "#10b981" },
    { name: "Memory", value: Math.round(totalEnergy * 0.22), color: "#3b82f6" },
    { name: "Disk I/O", value: Math.round(totalEnergy * 0.12), color: "#8b5cf6" },
    { name: "Network", value: Math.round(totalEnergy * 0.08), color: "#f59e0b" },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 text-xs">
      <div>
        <h2 className="text-xl tracking-tight">Software Carbon Analytics</h2>
        <p className="text-xs text-muted-foreground">
          Deep analysis correlating CPU execution efficiency with carbon grid intensity
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-muted-foreground">
              <ZapIcon className="h-3.5 w-3.5 text-emerald-500" />
              Total Energy
            </CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {totalEnergy.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-muted-foreground">
              <TreePineIcon className="h-3.5 w-3.5 text-emerald-500" />
              Total Carbon
            </CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {(totalCarbon / 1000).toFixed(1)} kg CO₂e
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-muted-foreground">
              <ActivityIcon className="h-3.5 w-3.5 text-blue-500" />
              Avg Carbon Intensity
            </CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {avgCarbonIntensity} g/kWh
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-muted-foreground">
              <GaugeIcon className="h-3.5 w-3.5 text-yellow-500" />
              Avg Efficiency
            </CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {avgEfficiency}/100
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Language Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Language Energy Profile
            </CardTitle>
            <CardDescription className="text-xs">
              Relative energy consumption (Wh) for standard workflows (1M operations)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={languageStats} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="language" className="text-[10px]" />
                <YAxis className="text-[10px]" />
                <Bar dataKey="energy" radius={[4, 4, 0, 0]}>
                  {languageStats.map((entry) => (
                    <Cell
                      key={entry.language}
                      fill={
                        entry.efficiency >= 90
                          ? "#10b981"
                          : entry.efficiency >= 75
                            ? "#3b82f6"
                            : entry.efficiency >= 50
                              ? "#f59e0b"
                              : "#ef4444"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Language Breakdown
            </CardTitle>
            <CardDescription className="text-xs">
              Energy cost by programming language
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {languageStats.map((stat) => (
              <div
                key={stat.language}
                className="flex justify-between items-center border-b border-border/20 pb-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{stat.language}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] ${
                      stat.efficiency >= 90
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : stat.efficiency >= 75
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    }`}
                  >
                    {stat.efficiency}%
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-mono text-emerald-500">{stat.energy} Wh</div>
                  <div className="text-[10px] text-muted-foreground">
                    {(stat.carbon / 1000).toFixed(1)} kg CO₂e
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Deployment Impact + Resource Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Deployment Energy Impact
            </CardTitle>
            <CardDescription className="text-xs">
              Energy before vs after each deployment
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deploymentImpact} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="name" className="text-[10px]" />
                <YAxis className="text-[10px]" />
                <Legend
                  content={({ payload }) => (
                    <div className="flex justify-center gap-4 mt-2">
                      {payload?.map((entry) => (
                        <div key={entry.value} className="flex items-center gap-1.5 text-[10px]">
                          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-muted-foreground">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                />
                <Bar dataKey="before" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="after" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Resource Energy Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              How energy is consumed across resource types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResourceDistributionChart data={resourceData} height={220} />
          </CardContent>
        </Card>
      </div>

      {/* Hotspot Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Energy Hotspots</CardTitle>
          <CardDescription className="text-xs">
            Endpoints consuming the most energy, sorted by impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HotspotTable hotspots={mockHotspots} />
        </CardContent>
      </Card>
    </div>
  );
}
