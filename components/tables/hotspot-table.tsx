"use client";

import * as React from "react";
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Hotspot } from "@/lib/mockData";

interface HotspotTableProps {
  hotspots: Hotspot[];
  maxRows?: number;
}

export function HotspotTable({ hotspots, maxRows }: HotspotTableProps) {
  const [sortField, setSortField] = React.useState<"energyWh" | "carbonGrams">("energyWh");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  const sorted = [...hotspots].sort((a, b) => {
    return sortOrder === "desc" ? b[sortField] - a[sortField] : a[sortField] - b[sortField];
  });

  const displayData = maxRows ? sorted.slice(0, maxRows) : sorted;

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "info":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingDownIcon className="h-3 w-3 text-emerald-500" />;
      case "regressing":
        return <TrendingUpIcon className="h-3 w-3 text-rose-500" />;
      default:
        return <MinusIcon className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border/40 text-muted-foreground font-semibold uppercase text-[10px]">
            <th className="py-2.5">Application</th>
            <th className="py-2.5">Endpoint</th>
            <th
              className="py-2.5 text-right cursor-pointer hover:text-foreground select-none"
              onClick={() => toggleSort("energyWh")}
            >
              Energy (Wh) {sortField === "energyWh" && (sortOrder === "desc" ? "▼" : "▲")}
            </th>
            <th
              className="py-2.5 text-right cursor-pointer hover:text-foreground select-none"
              onClick={() => toggleSort("carbonGrams")}
            >
              Carbon (g) {sortField === "carbonGrams" && (sortOrder === "desc" ? "▼" : "▲")}
            </th>
            <th className="py-2.5 text-center">Trend</th>
            <th className="py-2.5 text-center">Severity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/20">
          {displayData.map((hotspot) => (
            <tr key={hotspot.id} className="hover:bg-muted/40 transition-colors">
              <td className="py-3 font-semibold text-sm">{hotspot.application}</td>
              <td className="py-3 font-mono text-[11px] text-muted-foreground">
                {hotspot.endpoint}
              </td>
              <td className="py-3 text-right font-mono tabular-nums font-semibold text-emerald-500">
                {hotspot.energyWh.toLocaleString()} Wh
              </td>
              <td className="py-3 text-right font-mono tabular-nums">
                {hotspot.carbonGrams.toLocaleString()} g
              </td>
              <td className="py-3 text-center">
                <span className="inline-flex items-center gap-1">
                  {getTrendIcon(hotspot.trend)}
                  <span className="text-[10px] capitalize text-muted-foreground">
                    {hotspot.trend}
                  </span>
                </span>
              </td>
              <td className="py-3 text-center">
                <Badge
                  variant="outline"
                  className={`text-[9px] uppercase font-semibold ${getSeverityBadge(hotspot.severity)}`}
                >
                  {hotspot.severity}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
