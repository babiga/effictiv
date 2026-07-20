"use client";

import * as React from "react";
import {
  ShieldAlertIcon,
  Trash2Icon,
  CloudLightningIcon,
  CheckCircle2Icon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";

export function InfrastructureModule() {
  const [nodes, setNodes] = React.useState([
    {
      name: "aws-node-us-east-1a",
      type: "m5.2xlarge",
      status: "Active",
      workload: "data-pipeline",
      cpu: 84,
      mem: 75,
      powerW: 145,
    },
    {
      name: "aws-node-us-east-1b",
      type: "m5.xlarge",
      status: "Active",
      workload: "auth-service",
      cpu: 22,
      mem: 40,
      powerW: 85,
    },
    {
      name: "k8s-cluster-worker-3",
      type: "c5.xlarge",
      status: "Degraded",
      workload: "search-indexer",
      cpu: 91,
      mem: 88,
      powerW: 160,
    },
    {
      name: "zombie-db-instance-backup",
      type: "db.m5.xlarge",
      status: "Idle",
      workload: "None (Orphaned DB)",
      cpu: 2,
      mem: 8,
      powerW: 95,
    },
    {
      name: "dev-test-sandbox-instance",
      type: "t3.medium",
      status: "Idle",
      workload: "None (Forgotten sandbox)",
      cpu: 1,
      mem: 5,
      powerW: 45,
    },
  ]);

  // Terminate a zombie VM/server and show success
  const terminateInstance = (nodeName: string) => {
    setNodes(nodes.filter((n) => n.name !== nodeName));
    toast.success(
      `Server instance ${nodeName} terminated successfully! Savings updated.`,
    );
  };

  // Chart of energy draw by node
  const chartData = nodes.map((n) => ({
    name: n.name.slice(0, 12) + "...",
    power: n.powerW,
  }));

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 text-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl  tracking-tight">
            Cloud Infrastructure Telemetry
          </h2>
          <p className="text-xs text-muted-foreground">
            Monitor cluster node capacities, hypervisor hardware energy draw,
            and compute resources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 py-1"
          >
            AWS EKS Agent Connected
          </Badge>
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-500 border-blue-500/20 py-1"
          >
            Kepler DaemonSet Active
          </Badge>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase  text-muted-foreground">
              Total Core Draw
            </CardDescription>
            <CardTitle className="text-xl ">
              {nodes.reduce((sum, n) => sum + n.powerW, 0)} W
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={62} className="h-1 bg-muted" />
            <div className="text-[10px] text-muted-foreground mt-1">
              Average hypervisor power index
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase  text-muted-foreground">
              Monitored Clusters
            </CardDescription>
            <CardTitle className="text-xl ">3 Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CloudLightningIcon className="h-3.5 w-3.5 text-emerald-500" />
              <span>AWS EKS, GCP GKE, On-Prem</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-rose-500/20 bg-rose-500/[0.01]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase  text-rose-500">
              Infrastructure Waste
            </CardDescription>
            <CardTitle className="text-xl  text-rose-500">
              {nodes.filter((n) => n.status === "Idle").length} Zombie Nodes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80 font-medium">
              Consuming{" "}
              {nodes
                .filter((n) => n.status === "Idle")
                .reduce((sum, n) => sum + n.powerW, 0)}
              W static power while idle
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase  text-muted-foreground">
              Average Node CPU
            </CardDescription>
            <CardTitle className="text-xl ">
              {Math.round(
                nodes.reduce((sum, n) => sum + n.cpu, 0) / nodes.length,
              )}
              %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress
              value={nodes.reduce((sum, n) => sum + n.cpu, 0) / nodes.length}
              className="h-1 bg-muted"
            />
            <div className="text-[10px] text-muted-foreground mt-1">
              Underutilized capacity indicates waste
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3 Nodes Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Cluster Host VM Instances
            </CardTitle>
            <CardDescription className="text-xs">
              List of instances running the Kepler monitoring agent and
              reporting power indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground font-semibold uppercase text-[10px]">
                    <th className="py-2">Instance Name</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Active Workload</th>
                    <th className="py-2 text-right">CPU</th>
                    <th className="py-2 text-right">Memory</th>
                    <th className="py-2 text-right">Power Draw</th>
                    <th className="py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {nodes.map((node) => (
                    <tr key={node.name} className="hover:bg-muted/30">
                      <td className="py-3 font-semibold font-mono text-[11px]">
                        {node.name}
                      </td>
                      <td className="py-3 text-muted-foreground font-mono text-[10px]">
                        {node.type}
                      </td>
                      <td className="py-3">
                        <span className="font-medium text-foreground bg-muted px-1.5 py-0.5 rounded text-[10px]">
                          {node.workload}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-semibold tabular-nums">
                            {node.cpu}%
                          </span>
                          <div className="w-12 bg-muted rounded-full h-1">
                            <div
                              className={`h-1 rounded-full ${node.cpu > 80 ? "bg-rose-500" : node.cpu < 10 ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${node.cpu}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums">
                        {node.mem}%
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums text-emerald-500 font-semibold">
                        {node.powerW} W
                      </td>
                      <td className="py-3 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[9px] uppercase ${
                            node.status === "Active"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : node.status === "Idle"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse"
                                : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          }`}
                        >
                          {node.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Right 1/3: Idle node waste alert and Terminations */}
        <div className="flex flex-col gap-6">
          {/* Chart representation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Instance Power Breakdown
              </CardTitle>
              <CardDescription className="text-xs">
                Realtime hypervisor wattage reporting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: -10, right: 10, top: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      horizontal={false}
                      strokeDasharray="3 3"
                      className="stroke-border/40"
                    />
                    <XAxis type="number" className="text-[10px]" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      className="text-[10px]"
                      width={80}
                    />
                    <Bar
                      dataKey="power"
                      fill="oklch(0.627 0.194 149.251)"
                      radius={[0, 4, 4, 0]}
                    >
                      {nodes.map((node, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            node.status === "Idle"
                              ? "var(--color-destructive)"
                              : "oklch(0.627 0.194 149.251)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Action Card: Terminate Waste */}
          <Card className="border-rose-500/30 bg-rose-500/[0.01]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-rose-500">
                <ShieldAlertIcon className="h-4 w-4" />
                Zombie Instances (Idle Waste)
              </CardTitle>
              <CardDescription className="text-xs">
                Forgotten servers draining cloud resources and grid power
                without executing app code.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {nodes.filter((n) => n.status === "Idle").length > 0 ? (
                nodes
                  .filter((n) => n.status === "Idle")
                  .map((node) => (
                    <div
                      key={node.name}
                      className="flex justify-between items-center p-2 rounded-md bg-rose-500/5 border border-rose-500/10"
                    >
                      <div>
                        <div className=" text-foreground font-mono text-[11px]">
                          {node.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Draining{" "}
                          <strong className="text-foreground">
                            {node.powerW}W
                          </strong>{" "}
                          · cost:{" "}
                          <span className="text-rose-500 font-semibold">
                            $35/mo
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => terminateInstance(node.name)}
                        className="text-[10px] h-7 px-2 border-rose-500/20 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10"
                      >
                        <Trash2Icon className="h-3 w-3 mr-1" />
                        Terminate
                      </Button>
                    </div>
                  ))
              ) : (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-md text-emerald-500 font-semibold text-xs justify-center">
                  <CheckCircle2Icon className="h-4 w-4 text-emerald-500" />
                  No Zombie VM instances found! Excellent housekeeping!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
