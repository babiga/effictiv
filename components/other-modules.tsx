"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { FlameIcon, DownloadIcon, UserPlusIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import Image from "next/image";
import { mockInsights } from "@/lib/mockData";

// ==========================================
// 1. ANALYTICS MODULE
// ==========================================
export function AnalyticsModule() {
  const languageStats = [
    { language: "Rust", energy: 12, cost: 0.18, carbon: 4.5 },
    { language: "Go", energy: 28, cost: 0.42, carbon: 10.6 },
    { language: "TypeScript", energy: 62, cost: 0.93, carbon: 23.5 },
    { language: "Java", energy: 98, cost: 1.47, carbon: 37.2 },
    { language: "Python", energy: 145, cost: 2.18, carbon: 55.1 },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 text-xs">
      <div>
        <h2 className="text-xl  tracking-tight">Software Carbon Analytics</h2>
        <p className="text-xs text-muted-foreground">
          Deep analysis correlating CPU execution efficiency with carbon grid
          intensity
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Language Performance Profile
            </CardTitle>
            <CardDescription className="text-xs">
              Relative energy consumption (Wh) for standard serialization
              workflows (1M operations)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={languageStats} margin={{ left: -10 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border/40"
                />
                <XAxis dataKey="language" className="text-[10px]" />
                <YAxis className="text-[10px]" />
                <Bar
                  dataKey="energy"
                  fill="oklch(0.627 0.194 149.251)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Language Breakdown Details
            </CardTitle>
            <CardDescription className="text-xs">
              Energy cost index by stack
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {languageStats.map((stat) => (
              <div
                key={stat.language}
                className="flex justify-between items-center border-b border-border/20 pb-2"
              >
                <span className="font-semibold text-foreground">
                  {stat.language}
                </span>
                <div className="text-right">
                  <div className="font-mono  text-emerald-500">
                    {stat.energy} Wh
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    ${stat.cost} / {stat.carbon}g CO₂e
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==========================================
// 2. INSIGHTS MODULE
// ==========================================
export function InsightsModule() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 text-xs">
      <div>
        <h2 className="text-xl  tracking-tight">AI Root-Cause Insights</h2>
        <p className="text-xs text-muted-foreground">
          Machine learning anomaly detection pointing out software energy
          regressions
        </p>
      </div>

      <div className="space-y-4">
        {mockInsights.map((insight) => (
          <Card key={insight.id} className="bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase ${
                    insight.type === "Regression"
                      ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      : insight.type === "Optimization"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                  }`}
                >
                  {insight.type}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-muted text-muted-foreground ml-auto"
                >
                  {insight.application}
                </Badge>
              </div>
              <CardTitle className="text-base  leading-tight mt-1">
                {insight.title}
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground font-mono">
                Detected on {new Date(insight.timestamp).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {insight.description}
              </p>
            </CardContent>
            <CardFooter className="pt-0 justify-end">
              <Button
                variant="link"
                size="sm"
                className="text-emerald-500 text-xs"
              >
                Inspect flamegraph logs
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 3. BENCHMARKS MODULE
// ==========================================
export function BenchmarksModule() {
  const prCompare = {
    mainBranch: { energyWh: 45, cpu: 12, cost: 0.0067, carbon: 17.1 },
    prBranch: { energyWh: 78, cpu: 24, cost: 0.0117, carbon: 29.6 },
    appName: "payment-gateway",
    commitSha: "pr-feature-encrypt-12a",
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 text-xs">
      <div>
        <h2 className="text-xl  tracking-tight">Software Energy Benchmarks</h2>
        <p className="text-xs text-muted-foreground">
          Compare commits, branches, or pull requests during CI/CD to prevent
          energy regressions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Pull Request Regression Checker
          </CardTitle>
          <CardDescription className="text-xs">
            Comparing branch{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-rose-500">
              feature/encrypt-refactor
            </code>{" "}
            against{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">
              main
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-muted/20">
              <div className=" text-sm mb-2 flex justify-between">
                <span>main branch</span>
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                >
                  Baseline
                </Badge>
              </div>
              <div className="space-y-2 font-mono">
                <div className="flex justify-between border-b pb-1">
                  <span>Energy usage</span>
                  <span className=" text-foreground">
                    {prCompare.mainBranch.energyWh} Wh
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>CPU Average</span>
                  <span>{prCompare.mainBranch.cpu}%</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>CO₂ Output</span>
                  <span>{prCompare.mainBranch.carbon} g</span>
                </div>
                <div className="flex justify-between">
                  <span>Unit Cost</span>
                  <span>${prCompare.mainBranch.cost.toFixed(4)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border border-rose-500/30 rounded-lg bg-rose-500/[0.005]">
              <div className=" text-sm mb-2 flex justify-between">
                <span>PR branch</span>
                <Badge
                  variant="outline"
                  className="bg-rose-500/10 text-rose-500 border-rose-500/20"
                >
                  Regression Detected
                </Badge>
              </div>
              <div className="space-y-2 font-mono">
                <div className="flex justify-between border-b pb-1">
                  <span>Energy usage</span>
                  <span className=" text-rose-500">
                    +
                    {Math.round(
                      (prCompare.prBranch.energyWh /
                        prCompare.mainBranch.energyWh -
                        1) *
                        100,
                    )}
                    % ({prCompare.prBranch.energyWh} Wh)
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>CPU Average</span>
                  <span>{prCompare.prBranch.cpu}%</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>CO₂ Output</span>
                  <span>{prCompare.prBranch.carbon} g</span>
                </div>
                <div className="flex justify-between">
                  <span>Unit Cost</span>
                  <span>${prCompare.prBranch.cost.toFixed(4)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg flex items-start gap-2.5">
            <FlameIcon className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <div className=" text-foreground">Block Merge Recommendation</div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                This pull request increases energy footprint of{" "}
                <strong className="text-foreground">{prCompare.appName}</strong>{" "}
                by 73%. Check flamegraph trace for encryption loop anomalies in
                cryptography packages before merging.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// 4. REPORTS MODULE
// ==========================================
export function ReportsModule() {
  const [downloading, setDownloading] = React.useState(false);

  const handleGenerateReport = (type: string) => {
    setDownloading(true);
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
      loading: `Compiling ${type} Carbon and Cost efficiency reports...`,
      success: `${type} report generated. Downloading PDF...`,
      error: "Generation failed.",
    });
    setTimeout(() => setDownloading(false), 1500);
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 text-xs">
      <div>
        <h2 className="text-xl  tracking-tight">ESG & Cost Reporting</h2>
        <p className="text-xs text-muted-foreground">
          Export PDF/Excel summaries detailing corporate software carbon savings
          and green grid compliance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Executive ESG Report
            </CardTitle>
            <CardDescription className="text-xs">
              Summary of overall software carbon reductions, green metrics, and
              offset metrics. Fits corporate sustainability boards.
            </CardDescription>
          </CardHeader>
          <CardFooter className="bg-muted/15 border-t py-3">
            <Button
              size="sm"
              onClick={() => handleGenerateReport("Executive ESG")}
              disabled={downloading}
              className="w-full    gap-1.5 h-8"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Download ESG Summary
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Engineering efficiency report
            </CardTitle>
            <CardDescription className="text-xs">
              Details microservice-by-microservice energy scoring, regression
              histories, and developer contributions to energy reduction.
            </CardDescription>
          </CardHeader>
          <CardFooter className="bg-muted/15 border-t py-3">
            <Button
              size="sm"
              onClick={() => handleGenerateReport("Engineering")}
              disabled={downloading}
              className="w-full    gap-1.5 h-8"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Download Developer Log
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Infrastructure Cost & Carbon Correlation
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of AWS/GCP bills matched against electricity sources.
              Maps savings from zombie VM terminations.
            </CardDescription>
          </CardHeader>
          <CardFooter className="bg-muted/15 border-t py-3">
            <Button
              size="sm"
              onClick={() => handleGenerateReport("Cost Correlation")}
              disabled={downloading}
              className="w-full    gap-1.5 h-8"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Download Cloud Analysis
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// ==========================================
// 5. INTEGRATIONS MODULE
// ==========================================
export function IntegrationsModule() {
  const [integrations, setIntegrations] = React.useState([
    {
      id: "int-1",
      name: "GitHub Actions",
      desc: "Benchmark code commits for energy regression in CI/CD pipeline",
      category: "CI/CD",
      active: true,
    },
    {
      id: "int-2",
      name: "Kepler (Kubernetes Daemonset)",
      desc: "Collect power metrics on Bare metal and VM systems using eBPF probes",
      category: "Telemetry",
      active: true,
    },
    {
      id: "int-3",
      name: "AWS CloudWatch Provider",
      desc: "Sync EC2 runtime instance stats, sizing details, and VM metadata",
      category: "Cloud Provider",
      active: false,
    },
    {
      id: "int-4",
      name: "CO2.js (Green Web Foundation)",
      desc: "Estimate carbon metrics based on geographic location and grid coefficients",
      category: "Carbon API",
      active: true,
    },
  ]);

  const toggleIntegration = (id: string, name: string, active: boolean) => {
    setIntegrations(
      integrations.map((int) => (int.id === id ? { ...int, active } : int)),
    );
    toast.success(`${name} integration ${active ? "enabled" : "disabled"}.`);
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 text-xs">
      <div>
        <h2 className="text-xl  tracking-tight">Systems Integrations</h2>
        <p className="text-xs text-muted-foreground">
          Enable cloud monitors, CI benchmark tools, and telemetry collectors
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((int) => (
          <Card key={int.id} className="bg-card flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-[9px] uppercase ">
                  {int.category}
                </Badge>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    {int.active ? "Active" : "Inactive"}
                  </span>
                  <Switch
                    checked={int.active}
                    onCheckedChange={(checked) =>
                      toggleIntegration(int.id, int.name, checked)
                    }
                    aria-label={`Toggle ${int.name}`}
                  />
                </div>
              </div>
              <CardTitle className="text-base  mt-2">{int.name}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {int.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 6. TEAM MODULE
// ==========================================
export function TeamModule() {
  const members = [
    {
      name: "Khangal Hugo",
      role: "Principal Sustainability Architect",
      email: "sarah.chen@effictiv.ai",
      contributions: "Saved 4,500g carbon this month",
      avatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
    },
    {
      name: "Marcus Brody",
      role: "VP Site Reliability Engineering",
      email: "marcus.brody@effictiv.ai",
      contributions: "Terminated 4 zombie databases",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    },
    {
      name: "Emily Watson",
      role: "DevOps Engineer",
      email: "emily.watson@effictiv.ai",
      contributions: "Added Kepler Kubernetes daemonset",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80",
    },
  ];

  const inviteMember = () => {
    toast.success(
      "Invitation link copied to clipboard. Send it to your teammates.",
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 text-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl  tracking-tight">Workspace Team Members</h2>
          <p className="text-xs text-muted-foreground">
            Manage roles, alert subscriptions, and developer carbon budgets
          </p>
        </div>
        <Button onClick={inviteMember} size="sm" className="   gap-1.5 h-8">
          <UserPlusIcon className="h-4 w-4" />
          Invite Team Member
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {members.map((member) => (
          <Card
            key={member.name}
            className="bg-card flex flex-col justify-between"
          >
            <CardHeader className="pb-3 text-center">
              <div className="mx-auto size-16 rounded-full overflow-hidden border-2 border-emerald-500/20 grayscale mb-3">
                <Image
                  src={member.avatar}
                  alt={member.name}
                  width={64}
                  height={64}
                  className="size-full object-cover"
                />
              </div>
              <CardTitle className="text-base ">{member.name}</CardTitle>
              <CardDescription className="text-[10px] mt-0.5">
                {member.role}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4 text-center">
              <p className="text-muted-foreground text-[10px] font-mono">
                {member.email}
              </p>
              <Badge
                variant="outline"
                className="mt-3 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 py-0.5 px-2"
              >
                {member.contributions}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 7. SETTINGS MODULE
// ==========================================
export function SettingsModule() {
  const [thresholds, setThresholds] = React.useState({
    criticalLimit: "500",
    warningLimit: "200",
    pollInterval: "15",
  });

  const saveSettings = () => {
    toast.success("Global sustainability configurations saved successfully.");
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 text-xs">
      <div>
        <h2 className="text-xl  tracking-tight">System Settings</h2>
        <p className="text-xs text-muted-foreground">
          Configure alerting thresholds, webhook targets, and carbon budget
          metrics
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Alert Thresholds & budgets
          </CardTitle>
          <CardDescription className="text-xs">
            Specify maximum allowed energy metrics before alert timelines fire
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="critical-alert"
                className="font-semibold text-muted-foreground"
              >
                Critical Energy Limit (Wh per run)
              </label>
              <Input
                id="critical-alert"
                value={thresholds.criticalLimit}
                onChange={(e) =>
                  setThresholds({
                    ...thresholds,
                    criticalLimit: e.target.value,
                  })
                }
                className="bg-card font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="warning-alert"
                className="font-semibold text-muted-foreground"
              >
                Warning Limit (Wh per run)
              </label>
              <Input
                id="warning-alert"
                value={thresholds.warningLimit}
                onChange={(e) =>
                  setThresholds({ ...thresholds, warningLimit: e.target.value })
                }
                className="bg-card font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="poll-interval"
                className="font-semibold text-muted-foreground"
              >
                Telemetry Poll Interval (Seconds)
              </label>
              <Input
                id="poll-interval"
                value={thresholds.pollInterval}
                onChange={(e) =>
                  setThresholds({ ...thresholds, pollInterval: e.target.value })
                }
                className="bg-card font-mono"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border/20 flex justify-between items-center">
            <div className="space-y-0.5">
              <div className=" text-foreground">Acknowledge slack webhooks</div>
              <div className="text-[10px] text-muted-foreground">
                Forward carbon alert summaries automatically to developer
                channels
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="pt-2 flex justify-between items-center">
            <div className="space-y-0.5">
              <div className=" text-foreground">
                Enable Kepler Estimation model fallback
              </div>
              <div className="text-[10px] text-muted-foreground">
                Use CPU profile averages if telemetry daemon loses hypervisor
                connection
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t border-border/20 py-3 bg-muted/20">
          <Button onClick={saveSettings} className="   h-8">
            Save Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
