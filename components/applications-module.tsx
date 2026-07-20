"use client";

import * as React from "react";
import {
  SearchIcon,
  CpuIcon,
  LayersIcon,
  SparklesIcon,
  InfoIcon,
  ShieldAlertIcon,
  FileTextIcon,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Application,
  mockApplications,
  mockMeasurements,
  mockRecommendations,
} from "@/lib/mockData";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ApplicationsModuleProps {
  initialSearchQuery?: string;
  onNavigate: (tab: string) => void;
}

export function ApplicationsModule({
  initialSearchQuery = "",
  onNavigate,
}: ApplicationsModuleProps) {
  const [searchQuery, setSearchQuery] = React.useState(initialSearchQuery);
  const [selectedEnv, setSelectedEnv] = React.useState<
    "all" | "production" | "staging" | "development"
  >("all");
  const [selectedApp, setSelectedApp] = React.useState<Application | null>(
    null,
  );

  // React to initialSearchQuery changes (e.g. from Command Palette)
  React.useEffect(() => {
    if (initialSearchQuery) {
      const timer = setTimeout(() => {
        setSearchQuery(initialSearchQuery);
        // If we find an app with this name, let's auto-open it!
        const matched = mockApplications.find(
          (app) => app.name.toLowerCase() === initialSearchQuery.toLowerCase(),
        );
        if (matched) {
          setSelectedApp(matched);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialSearchQuery]);

  // Filters
  const filteredApps = mockApplications.filter((app) => {
    const matchesEnv = selectedEnv === "all" || app.environment === selectedEnv;
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.owner.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEnv && matchesSearch;
  });

  // Get color for language
  const getLanguageBadgeClass = (lang: string) => {
    switch (lang) {
      case "Go":
        return "bg-sky-500/10 text-sky-500 border-sky-500/20";
      case "Python":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
      case "TypeScript":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Rust":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "Java":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Get color for carbon grade
  const getGradeBadgeClass = (grade: string) => {
    switch (grade) {
      case "A":
        return "bg-emerald-500/20 text-emerald-500 border-emerald-500/30 ";
      case "B":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 ";
      case "C":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 ";
      case "D":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20 ";
      case "F":
        return "bg-rose-500/15 text-rose-500 border-rose-500/25 ";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Get status color
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "degraded":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "inactive":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Calculate detailed measurements for selected application
  const appMeasurements = selectedApp
    ? mockMeasurements.filter((m) => m.application === selectedApp.name)
    : [];

  // Recommendations for selected application
  const appRecommendations = selectedApp
    ? mockRecommendations.filter((r) => r.application === selectedApp.name)
    : [];

  // Generate drilldown chart data
  const chartData = appMeasurements
    .map((m, idx) => ({
      run: `Run ${idx + 1}`,
      energy: m.energyWh,
      cpu: m.cpuPercent,
      cost: m.cost * 100, // cents
    }))
    .reverse();

  const detailChartConfig = {
    energy: {
      label: "Energy (Wh)",
      color: "var(--primary)",
    },
    cpu: {
      label: "CPU Usage (%)",
      color: "var(--muted-foreground)",
    },
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* Header and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl  tracking-tight">Monitored Applications</h2>
          <p className="text-xs text-muted-foreground">
            Services reporting carbon emissions and execution energy metrics
          </p>
        </div>

        {/* Environment Filter tabs */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border/40 text-xs self-start md:self-auto">
          {(["all", "production", "staging", "development"] as const).map(
            (env) => (
              <button
                key={env}
                onClick={() => setSelectedEnv(env)}
                className={`px-3 py-1 rounded-md capitalize font-medium transition-colors ${
                  selectedEnv === env
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {env}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search applications by name, tech stack, or team owner..."
          className="pl-9 bg-card"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grid of App Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredApps.map((app) => (
          <Card
            key={app.id}
            onClick={() => setSelectedApp(app)}
            className="cursor-pointer hover:border-emerald-500/40 hover:shadow-md transition-all duration-200 bg-card group relative"
          >
            <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1 pr-6">
                <CardTitle className="text-base  group-hover:text-emerald-500 transition-colors">
                  {app.name}
                </CardTitle>
                <CardDescription className="text-[11px] font-mono text-muted-foreground/80">
                  {app.owner}
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={`text-[18px] py-1.5 px-3 rounded-md shrink-0 ${getGradeBadgeClass(app.energyScore)}`}
              >
                {app.energyScore}
              </Badge>
            </CardHeader>
            <CardContent className="pb-3 text-xs space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase font-semibold ${getLanguageBadgeClass(app.language)}`}
                >
                  {app.language}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase font-semibold capitalize ${getStatusBadgeClass(app.status)}`}
                >
                  {app.status}
                </Badge>
                <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                  {app.deploymentsCount} deploys
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-border/40 pt-3 tabular-nums">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Energy
                  </div>
                  <div className=" text-sm text-foreground mt-0.5">
                    {Math.round(app.energyUsagekWh)} kWh
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Cost
                  </div>
                  <div className=" text-sm text-foreground mt-0.5">
                    ${app.energyCost.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Carbon
                  </div>
                  <div className=" text-sm text-foreground mt-0.5">
                    {(app.carbonEmissionsGrams / 1000).toFixed(1)} kg
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2 pb-3 border-t border-border/20 text-[10px] text-muted-foreground flex justify-between items-center bg-muted/20">
              <span className="flex items-center gap-1">
                <CpuIcon className="h-3 w-3 text-muted-foreground/60" />
                <span>CPU: {app.cpuAverage}%</span>
              </span>
              <span className="flex items-center gap-1">
                <LayersIcon className="h-3 w-3 text-muted-foreground/60" />
                <span>Mem: {app.memoryAverage}MB</span>
              </span>
            </CardFooter>
          </Card>
        ))}

        {filteredApps.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center border border-dashed rounded-lg bg-card">
            <LayersIcon className="h-10 w-10 text-muted-foreground/60 mb-3" />
            <h3 className="font-semibold text-sm">No applications found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Try adjusting your environment filters or changing your search
              terms to locate services.
            </p>
          </div>
        )}
      </div>

      {/* Drill-down Detail Dialog */}
      <Dialog
        open={selectedApp !== null}
        onOpenChange={(open) => !open && setSelectedApp(null)}
      >
        {selectedApp && (
          <DialogContent className="max-w-2xl bg-card overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-xl  flex items-center gap-2">
                    {selectedApp.name}
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${getStatusBadgeClass(selectedApp.status)}`}
                    >
                      {selectedApp.status}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Software energy metrics for workspace sandbox · Owned by{" "}
                    {selectedApp.owner}
                  </DialogDescription>
                </div>
                <Badge
                  variant="outline"
                  className={`text-2xl py-2 px-4 rounded-xl ${getGradeBadgeClass(selectedApp.energyScore)}`}
                >
                  {selectedApp.energyScore}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-6 my-2 text-xs">
              {/* Metric grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/40 p-3 rounded-lg border border-border/50">
                <div className="space-y-0.5">
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">
                    Total Energy
                  </span>
                  <div className="text-sm  text-foreground">
                    {selectedApp.energyUsagekWh} kWh
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">
                    Estimated Cost
                  </span>
                  <div className="text-sm  text-foreground">
                    ${selectedApp.energyCost.toFixed(2)}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">
                    Carbon Produced
                  </span>
                  <div className="text-sm  text-foreground">
                    {(selectedApp.carbonEmissionsGrams / 1000).toFixed(2)} kg
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">
                    Deployments
                  </span>
                  <div className="text-sm  text-foreground">
                    {selectedApp.deploymentsCount} Runs
                  </div>
                </div>
              </div>

              {/* Chart section */}
              {chartData.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs flex items-center gap-1.5">
                    <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    Historical Telemetry (Recent Runs)
                  </h4>
                  <div className="border border-border/50 rounded-lg p-2 bg-background">
                    <ChartContainer
                      config={detailChartConfig}
                      className="aspect-auto h-[160px] w-full"
                    >
                      <AreaChart data={chartData}>
                        <CartesianGrid
                          vertical={false}
                          strokeDasharray="3 3"
                          className="stroke-border/40"
                        />
                        <XAxis
                          dataKey="run"
                          tickLine={false}
                          axisLine={false}
                          className="text-[10px]"
                        />
                        <ChartTooltip
                          content={<ChartTooltipContent indicator="line" />}
                        />
                        <Area
                          name="Energy (Wh)"
                          dataKey="energy"
                          type="monotone"
                          stroke="oklch(0.627 0.194 149.251)"
                          fill="oklch(0.627 0.194 149.251 / 10%)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center border rounded-lg text-muted-foreground flex flex-col items-center">
                  <ShieldAlertIcon className="h-8 w-8 mb-2 opacity-50" />
                  No runtime telemetry recorded yet. Trigger a commit benchmark
                  to populate statistics.
                </div>
              )}

              {/* Recommendations sub-list */}
              {appRecommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs flex items-center gap-1.5 text-emerald-500">
                    <SparklesIcon className="h-3.5 w-3.5 text-emerald-500" />
                    Available AI Recommendations
                  </h4>
                  <div className="space-y-2">
                    {appRecommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-3 border border-emerald-500/20 bg-emerald-500/[0.02] rounded-lg flex justify-between items-start"
                      >
                        <div className="space-y-1">
                          <div className=" text-foreground">{rec.title}</div>
                          <p className="text-[11px] text-muted-foreground">
                            {rec.description}
                          </p>
                          <div className="flex gap-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                            <span>
                              Savings: +${rec.estimatedSavingsCost}/mo
                            </span>
                            <span>
                              Carbon: -
                              {(rec.estimatedSavingsCarbon / 1000).toFixed(1)}kg
                              CO2e
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedApp(null);
                            onNavigate("recommendations");
                          }}
                          className="text-[10px] h-7    shrink-0 ml-4"
                        >
                          Optimize
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent runs log table */}
              {appMeasurements.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs flex items-center gap-1.5">
                    <FileTextIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    Telemetry Execution Logs
                  </h4>
                  <div className="border border-border/40 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted text-[10px] font-semibold text-muted-foreground uppercase border-b border-border/40">
                          <th className="p-2 pl-3">Time</th>
                          <th className="p-2">Service Component</th>
                          <th className="p-2 text-right">Energy (Wh)</th>
                          <th className="p-2 text-right">CPU %</th>
                          <th className="p-2 text-right">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {appMeasurements.map((m) => (
                          <tr key={m.id} className="hover:bg-muted/10">
                            <td className="p-2 pl-3 font-mono text-[10px] text-muted-foreground">
                              {new Date(m.timestamp).toLocaleDateString()}
                            </td>
                            <td className="p-2 font-medium">{m.service}</td>
                            <td className="p-2 text-right font-mono tabular-nums text-emerald-500 font-semibold">
                              {m.energyWh} Wh
                            </td>
                            <td className="p-2 text-right font-mono tabular-nums">
                              {m.cpuPercent}%
                            </td>
                            <td className="p-2 text-right font-mono tabular-nums">
                              ${m.cost.toFixed(4)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-border/30 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedApp(null)}
              >
                Close Panel
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
