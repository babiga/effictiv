"use client";

import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface EnergyKpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  icon: LucideIcon;
  iconColor?: string;
  accent?: boolean;
}

export function EnergyKpiCard({
  title,
  value,
  unit,
  trend,
  trendValue,
  icon: Icon,
  iconColor = "text-emerald-500",
  accent = false,
}: EnergyKpiCardProps) {
  return (
    <Card
      className={`bg-card shadow-sm transition-all duration-200 ${
        accent
          ? "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.02] border-emerald-500/20 hover:border-emerald-500/40"
          : "hover:border-muted-foreground/30"
      }`}
    >
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>{title}</span>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums tracking-tight">
          {value}
          {unit && (
            <span className="text-xs font-normal text-muted-foreground ml-1">
              {unit}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      {trend && trendValue && (
        <CardContent className="pb-2">
          <div
            className={`flex items-center gap-1.5 text-xs font-medium ${
              trend === "down"
                ? "text-emerald-600 dark:text-emerald-400"
                : trend === "up"
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground"
            }`}
          >
            {trend === "down" && <TrendingDownIcon className="h-3.5 w-3.5" />}
            {trend === "up" && <TrendingUpIcon className="h-3.5 w-3.5" />}
            {trend === "flat" && <MinusIcon className="h-3.5 w-3.5" />}
            <span>{trendValue}</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
