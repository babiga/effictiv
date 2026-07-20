"use client";

import { GitCommitIcon, TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Deployment } from "@/lib/mockData";

interface DeploymentTimelineProps {
  deployments: Deployment[];
  maxRows?: number;
}

export function DeploymentTimeline({ deployments, maxRows }: DeploymentTimelineProps) {
  const displayData = maxRows ? deployments.slice(0, maxRows) : deployments;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "improved":
        return {
          badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
          dot: "bg-emerald-500",
          icon: TrendingDownIcon,
          iconColor: "text-emerald-500",
        };
      case "regression":
        return {
          badge: "bg-rose-500/10 text-rose-500 border-rose-500/20",
          dot: "bg-rose-500",
          icon: TrendingUpIcon,
          iconColor: "text-rose-500",
        };
      default:
        return {
          badge: "bg-muted text-muted-foreground border-border",
          dot: "bg-muted-foreground",
          icon: MinusIcon,
          iconColor: "text-muted-foreground",
        };
    }
  };

  return (
    <div className="space-y-0">
      {displayData.map((dep, idx) => {
        const config = getStatusConfig(dep.status);
        const Icon = config.icon;
        const energyDelta = dep.energyAfter - dep.energyBefore;
        const energyDeltaPercent = dep.energyBefore > 0
          ? Math.round((energyDelta / dep.energyBefore) * 100)
          : 0;

        return (
          <div key={dep.id} className="flex gap-3 relative">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`size-2.5 rounded-full mt-1.5 flex-shrink-0 ${config.dot}`} />
              {idx < displayData.length - 1 && (
                <div className="w-px flex-1 bg-border/40 my-1" />
              )}
            </div>

            {/* Content */}
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <GitCommitIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-semibold truncate">{dep.version}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{dep.commitSha}</span>
                </div>
                <Badge variant="outline" className={`text-[9px] uppercase font-semibold shrink-0 ${config.badge}`}>
                  {dep.status}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] text-muted-foreground">{dep.application}</span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground">{dep.author}</span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {new Date(dep.timestamp).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1">
                  <Icon className={`h-3 w-3 ${config.iconColor}`} />
                  <span className={config.iconColor}>
                    {energyDelta > 0 ? "+" : ""}{energyDelta} Wh ({energyDeltaPercent > 0 ? "+" : ""}{energyDeltaPercent}%)
                  </span>
                </div>
                <span className="text-muted-foreground">
                  CPU: {dep.cpuBefore}% → {dep.cpuAfter}%
                </span>
                <span className="text-muted-foreground">
                  Efficiency: {dep.efficiencyBefore} → {dep.efficiencyAfter}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
