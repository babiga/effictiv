"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  ResponsiveContainer,
  Cell,
  Pie,
  PieChart,
} from "recharts";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  AlertTriangleIcon,
  SparklesIcon,
  LeafIcon,
  FlameIcon,
  DollarSignIcon,
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import {
  mockApplications,
  mockMeasurements,
  mockRecommendations,
  mockAlerts,
} from "@/lib/mockData";

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
  // Calculate potential savings based on applied recommendations
  const totalPotentialSavings = mockRecommendations
    .filter((r) => r.status === "Active")
    .reduce((sum, r) => sum + r.estimatedSavingsCost, 0);

  // Adjust potential savings if user applied some recommendations
  const currentSavingsPotential = Math.max(
    0,
    totalPotentialSavings - appliedCount * 45,
  ); // estimate $45 saved per applied recommendation for mock purposes

  // Filter mock data based on environment
  const filteredApps = mockApplications.filter(
    (app) => environment === "all" || app.environment === environment,
  );

  // Energy usage calculations
  const totalEnergy = filteredApps.reduce(
    (sum, app) => sum + app.energyUsagekWh,
    0,
  );
  const totalCost = filteredApps.reduce((sum, app) => sum + app.energyCost, 0);
  const totalCarbon = filteredApps.reduce(
    (sum, app) => sum + app.carbonEmissionsGrams,
    0,
  );
  const avgEfficiency = Math.round(
    filteredApps.length > 0
      ? filteredApps.reduce((sum, app) => {
          const scoreMap = { A: 95, B: 85, C: 75, D: 60, E: 45, F: 30 };
          return sum + scoreMap[app.energyScore];
        }, 0) / filteredApps.length
      : 80,
  );

  // Energy Trend Chart Data based on time range
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

      // Add minor randomness
      const offset =
        Math.sin(idx) * (baseEnergy * 0.15) +
        Math.random() * (baseEnergy * 0.05);
      const total = baseEnergy + offset;

      return {
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        energy: Math.round(total),
        carbon: Math.round(total * 0.38), // 380g CO2 per kWh average
      };
    });
  };

  const trendData = generateTrendData();

  // Top Consumers data
  const consumerData = filteredApps
    .map((app) => ({
      name: app.name,
      energy: Math.round(app.energyUsagekWh),
      cost: Math.round(app.energyCost),
    }))
    .sort((a, b) => b.energy - a.energy)
    .slice(0, 5);

  // Resource distribution by infrastructure source
  const infraData = [
    {
      name: "AWS EC2 / EKS",
      value: Math.round(totalEnergy * 0.62),
      color: "#10b981",
    },
    {
      name: "GCP Kubernetes",
      value: Math.round(totalEnergy * 0.23),
      color: "#3b82f6",
    },
    {
      name: "On-Prem / Hybrid",
      value: Math.round(totalEnergy * 0.15),
      color: "#6366f1",
    },
  ];

  const trendChartConfig = {
    energy: {
      label: "Energy (kWh)",
      color: "var(--primary)",
    },
    carbon: {
      label: "Carbon (kg CO2e)",
      color: "var(--muted-foreground)",
    },
  } satisfies ChartConfig;

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* KPI 1: Energy Usage */}
        <Card className="bg-card shadow-sm hover:border-muted-foreground/30 transition-all duration-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Energy Usage</span>
              <LeafIcon className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl  tracking-tight">
              {totalEnergy.toLocaleString(undefined, {
                maximumFractionDigits: 1,
              })}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                kWh
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <TrendingDownIcon className="h-3.5 w-3.5" />
              <span>-4.2% from last period</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Estimated Energy Cost */}
        <Card className="bg-card shadow-sm hover:border-muted-foreground/30 transition-all duration-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Estimated Cost</span>
              <DollarSignIcon className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl  tracking-tight">
              $
              {totalCost.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <TrendingDownIcon className="h-3.5 w-3.5" />
              <span>-${(totalCost * 0.042).toFixed(2)} saved this week</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Carbon Footprint */}
        <Card className="bg-card shadow-sm hover:border-muted-foreground/30 transition-all duration-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Carbon Footprint</span>
              <FlameIcon className="h-4 w-4 text-orange-500" />
            </CardDescription>
            <CardTitle className="text-2xl  tracking-tight">
              {(totalCarbon / 1000).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                kg CO₂e
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
              <TrendingUpIcon className="h-3.5 w-3.5" />
              <span>+1.8% Grid intensity spike</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Efficiency Score */}
        <Card className="bg-card shadow-sm hover:border-muted-foreground/30 transition-all duration-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Efficiency Score</span>
              <SparklesIcon className="h-4 w-4 text-yellow-500" />
            </CardDescription>
            <CardTitle className="text-2xl  tracking-tight flex items-baseline gap-1">
              <span>{avgEfficiency}</span>
              <span className="text-xs font-normal text-muted-foreground">
                /100
              </span>
              <Badge
                variant="outline"
                className="ml-2 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] py-0 px-1.5"
              >
                Grade{" "}
                {avgEfficiency >= 90
                  ? "A"
                  : avgEfficiency >= 80
                    ? "B"
                    : avgEfficiency >= 70
                      ? "C"
                      : "D"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <TrendingUpIcon className="h-3.5 w-3.5" />
              <span>+2 points increase</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 5: Potential Savings */}
        <Card className="bg-emerald-500/[0.03] dark:bg-emerald-500/[0.02] border-emerald-500/20 shadow-sm hover:border-emerald-500/40 transition-all duration-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span>Potential Savings</span>
              <SparklesIcon className="h-4 w-4 text-emerald-500 animate-pulse" />
            </CardDescription>
            <CardTitle className="text-2xl  tracking-tight text-emerald-600 dark:text-emerald-400">
              ${currentSavingsPotential.toFixed(2)}
              <span className="text-xs font-normal">/mo</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-xs text-emerald-700/80 dark:text-emerald-400/80 font-medium flex items-center justify-between">
              <span>
                {
                  mockRecommendations.filter((r) => r.status === "Active")
                    .length
                }{" "}
                recommendations pending
              </span>
              <button
                onClick={() => onNavigate("recommendations")}
                className="text-[10px] text-emerald-600 dark:text-emerald-400  hover:underline leading-none"
              >
                Optimize →
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2/3: Energy Usage Trend Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base font-semibold">
                Energy & Carbon Trend
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time software power consumption correlation against Grid
                intensity
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge
                variant="outline"
                className="text-[10px] border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
              >
                Live Telemetry
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-2 pt-2">
            <ChartContainer
              config={trendChartConfig}
              className="aspect-auto h-[280px] w-full"
            >
              <AreaChart
                data={trendData}
                margin={{ left: 12, right: 12, top: 8, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="fillEnergy" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-energy)"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-energy)"
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  className="stroke-border/40"
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  className="text-xs text-muted-foreground"
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      labelFormatter={(value) => `Timeline: ${value}`}
                    />
                  }
                />
                <Area
                  name="Energy (kWh)"
                  dataKey="energy"
                  type="monotone"
                  fill="url(#fillEnergy)"
                  stroke="oklch(0.627 0.194 149.251)" // Emerald color line
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Right 1/3: Top Consumers and Infrastructure Share */}
        <div className="flex flex-col gap-6">
          {/* Top Consumers Bar Chart */}
          <Card className="flex flex-col flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Top Energy Consumers
              </CardTitle>
              <CardDescription className="text-xs">
                Apps generating the largest energy draw
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <div className="space-y-3 mt-1">
                {consumerData.map((app, index) => (
                  <div key={app.name} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-muted-foreground w-4">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs font-medium mb-1">
                        <span className="truncate">{app.name}</span>
                        <span className="tabular-nums font-semibold">
                          {app.energy} kWh
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${(app.energy / (consumerData[0]?.energy || 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Infrastructure Distribution Pie Chart */}
          <Card className="flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="text-base font-semibold">
                Infrastructure Share
              </CardTitle>
              <CardDescription className="text-xs">
                Energy consumption breakdown
              </CardDescription>
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
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase  text-muted-foreground">
                    Grid
                  </span>
                  <span className="text-xs  tabular-nums text-foreground">
                    100%
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 ml-4 flex-1">
                {infraData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="size-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate text-muted-foreground">
                        {item.name}
                      </span>
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

      {/* Intelligence & Recent Measurements row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Energy Hotspots & Recent Alerts */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Active Regressions & Alerts
              </CardTitle>
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
              System threshold violations needing immediate attention
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
                      <span className="text-xs font-semibold text-foreground">
                        {alert.title}
                      </span>
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
                        App:{" "}
                        <strong className="text-foreground">
                          {alert.application}
                        </strong>
                      </span>
                      <span>
                        Value:{" "}
                        <strong className="text-foreground">
                          {alert.value}
                        </strong>
                      </span>
                      <span>
                        Threshold:{" "}
                        <strong className="text-foreground">
                          {alert.threshold}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              ))}

            {/* AI Insights summary */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mt-2">
              <div className="flex items-center gap-2 mb-1.5">
                <SparklesIcon className="h-4 w-4 text-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-foreground">
                  AI Insight: Carbon Savings Potential
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                We detected that{" "}
                <strong className="text-foreground">data-pipeline</strong>{" "}
                staging runs are running on standard x86 instances during high
                carbon intensity periods. Transitioning this to ARM architecture
                could save up to{" "}
                <span className="text-emerald-500 ">$95.40/mo</span> and prevent{" "}
                <strong className="text-foreground">719kg of CO₂e</strong>{" "}
                carbon output.
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

        {/* Right Column: Recent Measurements run history */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Recent Energy Measurements
              </CardTitle>
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
              Granular micro-measurements gathered from Kubernetes (Kepler) and
              CodeCarbon agents
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
                    <th className="py-2 text-right">CPU %</th>
                    <th className="py-2 text-right">Instance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {mockMeasurements.slice(0, 5).map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <td className="py-2 pl-1 font-mono text-[10px] text-muted-foreground">
                        {new Date(m.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 font-medium">{m.application}</td>
                      <td className="py-2 text-muted-foreground">
                        {m.service}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums font-semibold text-emerald-500">
                        {m.energyWh} Wh
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums">
                        {m.cpuPercent}%
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {m.machineType}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
