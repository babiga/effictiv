"use client";

import { TreePineIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CarbonCardProps {
  carbonGrams: number;
  previousCarbonGrams?: number;
  compact?: boolean;
}

export function CarbonCard({
  carbonGrams,
  previousCarbonGrams,
  compact = false,
}: CarbonCardProps) {
  const carbonKg = carbonGrams / 1000;
  const change = previousCarbonGrams
    ? ((carbonGrams - previousCarbonGrams) / previousCarbonGrams) * 100
    : 0;
  const treesEquivalent = (carbonGrams / 21000).toFixed(1);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <TreePineIcon className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-semibold tabular-nums">
          {carbonKg.toFixed(1)} kg CO₂e
        </span>
        {change !== 0 && (
          <span
            className={`text-[10px] font-semibold ${
              change < 0 ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {change < 0 ? "↓" : "↑"} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
    );
  }

  return (
    <Card className="bg-card">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center justify-between text-[10px] uppercase font-semibold text-muted-foreground">
          <span>Carbon Footprint</span>
          <TreePineIcon className="h-4 w-4 text-emerald-500" />
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums tracking-tight">
          {carbonKg.toFixed(1)}{" "}
          <span className="text-xs font-normal text-muted-foreground">kg CO₂e</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TreePineIcon className="h-3 w-3 text-emerald-500" />
            <span>≈ {treesEquivalent} trees absorbing CO₂ for a year</span>
          </div>
          {change !== 0 && (
            <span
              className={`text-[10px] font-semibold ${
                change < 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {change < 0 ? "↓" : "↑"} {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
