"use client";

import * as React from "react";
import { motion } from "framer-motion";
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
  mockInsights,
  mockDeployments,
  mockSustainabilitySummary,
} from "@/lib/mockData";
import { EnergyTrendChart } from "@/components/charts/energy-trend-chart";
import { EnergyBreakdownChart } from "@/components/charts/energy-breakdown-chart";
import { HotspotTable } from "@/components/tables/hotspot-table";
import { DeploymentTimeline } from "@/components/tables/deployment-timeline";
import { SustainabilitySummaryHero } from "@/components/cards/sustainability-summary";
import { SustainabilityImpact } from "@/components/cards/sustainability-impact";
import { EnhancedInsightsSection } from "@/components/enhanced-insights-section";
import { EnhancedRecommendationsSection } from "@/components/enhanced-recommendations-section";

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

  const totalEnergy = filteredApps.reduce(
    (sum, app) => sum + app.energyUsagekWh,
    0,
  );
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

  const currentGreenScore =
    mockGreenScoreHistory[mockGreenScoreHistory.length - 1]?.score || 78;
  const previousGreenScore =
    mockGreenScoreHistory[mockGreenScoreHistory.length - 8]?.score || 72;

  const activeRecommendations = mockRecommendations.filter(
    (r) => r.status === "Active",
  );
  const totalEnergyReduction = activeRecommendations.reduce(
    (sum, r) => sum + r.estimatedSavingskWh,
    0,
  );

  const treesEquivalent = (totalCarbon / 21000).toFixed(1);

  const trendData = React.useMemo(() => {
    const points = timeRange === "7d" ? 7 : timeRange === "30d" ? 15 : 30;
    const baseValues = [1820, 1795, 1810, 1780, 1750, 1770, 1740, 1760, 1730, 1720,
      1710, 1700, 1690, 1685, 1680, 1675, 1670, 1665, 1660, 1655, 1650, 1648,
      1645, 1642, 1640, 1638, 1635, 1633, 1630, 1628];
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
              : baseValues[baseValues.length - points + idx] || 1680;
      const offset = Math.sin(idx * 0.8) * (baseEnergy * 0.04);
      return {
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        energy: Math.round(baseEnergy + offset),
        carbon: Math.round((baseEnergy + offset) * 0.38),
      };
    });
  }, [timeRange, environment]);

  const deploymentMarkers = React.useMemo(() => {
    const points = timeRange === "7d" ? 7 : timeRange === "30d" ? 15 : 30;
    const recentDeployments = mockDeployments.slice(0, 4);
    return recentDeployments
      .map((dep) => {
        const depDate = new Date(dep.timestamp);
        const now = new Date();
        const daysAgo = Math.floor(
          (now.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysAgo >= points) return null;
        const dateStr = depDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const energyChangePercent =
          dep.energyBefore > 0
            ? Math.round(
                ((dep.energyAfter - dep.energyBefore) / dep.energyBefore) * 100,
              )
            : 0;
        return {
          date: dateStr,
          version: dep.version,
          status: dep.status,
          energyChangePercent,
        };
      })
      .filter(Boolean) as Array<{
      date: string;
      version: string;
      status: "improved" | "regression" | "neutral";
      energyChangePercent: number;
    }>;
  }, [timeRange]);

  const languageData = [
    {
      name: "Python",
      value: Math.round(
        filteredApps
          .filter((a) => a.language === "Python")
          .reduce((s, a) => s + a.energyUsagekWh, 0),
      ),
      color: "#eab308",
    },
    {
      name: "Java",
      value: Math.round(
        filteredApps
          .filter((a) => a.language === "Java")
          .reduce((s, a) => s + a.energyUsagekWh, 0),
      ),
      color: "#ef4444",
    },
    {
      name: "TypeScript",
      value: Math.round(
        filteredApps
          .filter((a) => a.language === "TypeScript")
          .reduce((s, a) => s + a.energyUsagekWh, 0),
      ),
      color: "#3b82f6",
    },
    {
      name: "Go",
      value: Math.round(
        filteredApps
          .filter((a) => a.language === "Go")
          .reduce((s, a) => s + a.energyUsagekWh, 0),
      ),
      color: "#06b6d4",
    },
    {
      name: "Rust",
      value: Math.round(
        filteredApps
          .filter((a) => a.language === "Rust")
          .reduce((s, a) => s + a.energyUsagekWh, 0),
      ),
      color: "#f97316",
    },
  ].filter((d) => d.value > 0);

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

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* Section 1: Sustainability Summary Hero */}
      <SustainabilitySummaryHero
        summary={mockSustainabilitySummary}
        onNavigate={onNavigate}
      />

      {/* Section 2: KPI Overview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <Card className="bg-card shadow-sm hover:border-muted-foreground/30 transition-all duration-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Green Score</span>
              <LeafIcon className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums tracking-tight text-emerald-500">
              {currentGreenScore}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                /100
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <SparklesIcon className="h-3.5 w-3.5" />
              <span>
                +{currentGreenScore - previousGreenScore} points this week
              </span>
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
              {totalEnergy.toLocaleString(undefined, {
                maximumFractionDigits: 1,
              })}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                kWh
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
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
              {(totalCarbon / 1000).toLocaleString(undefined, {
                maximumFractionDigits: 1,
              })}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                kg CO₂e
              </span>
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
            <CardTitle className="flex items-baseline gap-1 text-2xl tabular-nums tracking-tight">
              <span>{avgEfficiency}</span>
              <span className="text-xs font-normal text-muted-foreground">
                /100
              </span>
              <Badge
                variant="outline"
                className="ml-2 border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-500"
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
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <SparklesIcon className="h-3.5 w-3.5" />
              <span>+2 points increase</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/[0.03] shadow-sm transition-all duration-200 hover:border-emerald-500/40 dark:bg-emerald-500/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span>Energy Reduction Potential</span>
              <ZapIcon className="h-4 w-4 animate-pulse text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              {totalEnergyReduction.toLocaleString()}{" "}
              <span className="text-xs font-normal">kWh/mo</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center justify-between text-xs font-medium text-emerald-700/80 dark:text-emerald-400/80">
              <span>{activeRecommendations.length} optimizations available</span>
              <button
                onClick={() => onNavigate("recommendations")}
                className="leading-none text-[10px] text-emerald-600 hover:underline dark:text-emerald-400"
              >
                Optimize →
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 3: Energy & Carbon Trend */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base font-semibold">
                Energy & Carbon Trend
              </CardTitle>
              <CardDescription className="text-xs">
                Software power consumption and grid carbon intensity over time
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-500"
            >
              Live Telemetry
            </Badge>
          </CardHeader>
          <CardContent className="px-2 pt-2">
            <EnergyTrendChart
              data={trendData}
              height={300}
              showCarbon
              deployments={deploymentMarkers}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 4: AI Sustainability Insights */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <EnhancedInsightsSection
          insights={mockInsights}
          onNavigate={onNavigate}
        />
      </motion.div>

      {/* Section 5: Optimization Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <EnhancedRecommendationsSection
          recommendations={mockRecommendations}
          onNavigate={onNavigate}
        />
      </motion.div>

      {/* Section 6: Sustainability Impact */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <SustainabilityImpact
          impact={mockSustainabilitySummary.impact}
          carbonPreventedKg={mockSustainabilitySummary.carbonPreventedKg}
        />
      </motion.div>

      {/* Section 7: Hotspots + Deployments */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Energy Hotspots
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("analytics")}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
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
              <CardTitle className="text-base font-semibold">
                Recent Deployments
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("deployments")}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                View all
              </Button>
            </div>
            <CardDescription className="text-xs">
              How recent deployments affected energy efficiency
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <DeploymentTimeline deployments={mockDeployments} maxRows={5} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 8: Active Alerts (condensed) */}
      {mockAlerts.filter((a) => a.status === "Active").length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  Active Alerts
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate("alerts")}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  View all alerts
                </Button>
              </div>
              <CardDescription className="text-xs">
                Carbon regressions and energy threshold violations requiring
                attention
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockAlerts
                .filter((a) => a.status === "Active")
                .map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                  >
                    <AlertTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {alert.title}
                        </span>
                        <Badge
                          variant="outline"
                          className="border-destructive/20 bg-destructive/10 px-1 py-0 text-[10px] uppercase text-destructive"
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {alert.description}
                      </p>
                      <div className="flex gap-3 pt-1 text-[10px] text-muted-foreground">
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
                      </div>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
