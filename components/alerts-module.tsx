"use client";

import * as React from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ShieldAlertIcon,
  InfoIcon,
  ClockIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockAlerts, Alert } from "@/lib/mockData";
import { toast } from "sonner";

export function AlertsModule() {
  const [alerts, setAlerts] = React.useState<Alert[]>(mockAlerts);
  const [filter, setFilter] = React.useState<
    "all" | "Active" | "Acknowledged" | "Resolved"
  >("all");

  // Resolve alert
  const handleResolve = (id: string, title: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "Resolved" as const } : a,
      ),
    );
    toast.success(`Alert resolved: ${title}`);
  };

  // Acknowledge alert
  const handleAcknowledge = (id: string, title: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "Acknowledged" as const } : a,
      ),
    );
    toast.info(`Alert acknowledged: ${title}`);
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "Warning":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "Info":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse";
      case "Acknowledged":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "Resolved":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const filteredAlerts = alerts.filter(
    (a) => filter === "all" || a.status === filter,
  );

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 text-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl  tracking-tight">
            System Energy & Carbon Alerts
          </h2>
          <p className="text-xs text-muted-foreground">
            View active carbon intensity regressions, power surges, or telemetry
            connection disconnects
          </p>
        </div>

        {/* State filters */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border/40 text-xs self-start md:self-auto">
          {(["all", "Active", "Acknowledged", "Resolved"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-md capitalize font-medium transition-colors ${
                filter === s
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Alert List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <Card
            key={alert.id}
            className={`bg-card transition-all ${
              alert.status === "Active"
                ? "border-rose-500/25 bg-rose-500/[0.005]"
                : "border-border/50"
            }`}
          >
            <div className="p-4 flex flex-col sm:flex-row gap-4 items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {alert.severity === "Critical" ? (
                    <ShieldAlertIcon className="h-5 w-5 text-rose-500" />
                  ) : alert.severity === "Warning" ? (
                    <AlertTriangleIcon className="h-5 w-5 text-amber-500" />
                  ) : (
                    <InfoIcon className="h-5 w-5 text-blue-500" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className=" text-sm text-foreground">{alert.title}</h3>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-semibold ${getSeverityBadgeClass(alert.severity)}`}
                    >
                      {alert.severity}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-semibold capitalize ${getStatusBadgeClass(alert.status)}`}
                    >
                      {alert.status}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed max-w-2xl">
                    {alert.description}
                  </p>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground font-mono pt-1.5">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="h-3 w-3" />
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                    </span>
                    <span>
                      App:{" "}
                      <strong className="text-foreground">
                        {alert.application}
                      </strong>
                    </span>
                    <span>
                      Reported Value:{" "}
                      <strong className="text-rose-500">{alert.value}</strong>
                    </span>
                    <span>
                      Threshold Limit:{" "}
                      <strong className="text-foreground">
                        {alert.threshold}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              {alert.status !== "Resolved" && (
                <div className="flex gap-2 self-end sm:self-center shrink-0">
                  {alert.status === "Active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcknowledge(alert.id, alert.title)}
                      className="h-8 border-border text-foreground hover:bg-muted"
                    >
                      Acknowledge
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleResolve(alert.id, alert.title)}
                    className="h-8   "
                  >
                    Resolve
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}

        {filteredAlerts.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed rounded-lg bg-card text-muted-foreground">
            <CheckCircle2Icon className="h-10 w-10 text-emerald-500 mb-3" />
            <h3 className="font-semibold text-sm">
              No alerts in this status group
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Your software carbon threshold alerts are all clear.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
