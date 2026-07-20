"use client";

import * as React from "react";
import { LightbulbIcon, FilterIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockInsights } from "@/lib/mockData";
import { InsightCard } from "@/components/cards/insight-card";

export function InsightsModule() {
  const [filter, setFilter] = React.useState<"all" | "Regression" | "Optimization" | "Hotspot">("all");

  const filteredInsights = filter === "all"
    ? mockInsights
    : mockInsights.filter((i) => i.type === filter);

  const counts = {
    all: mockInsights.length,
    Regression: mockInsights.filter((i) => i.type === "Regression").length,
    Optimization: mockInsights.filter((i) => i.type === "Optimization").length,
    Hotspot: mockInsights.filter((i) => i.type === "Hotspot").length,
  };

  const totalEnergySaved = mockInsights.reduce((s, i) => s + i.environmentalImpact.energySavedWh, 0);
  const totalCarbonSaved = mockInsights.reduce((s, i) => s + i.environmentalImpact.carbonSavedGrams, 0);

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 text-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl tracking-tight">AI Energy Insights</h2>
          <p className="text-xs text-muted-foreground">
            Machine learning anomaly detection identifying software energy patterns and optimization opportunities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 py-1">
            {totalEnergySaved.toLocaleString()} Wh potential savings
          </Badge>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 py-1">
            {(totalCarbonSaved / 1000).toFixed(1)} kg CO₂e recoverable
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border/40 text-xs self-start">
        {(["all", "Regression", "Optimization", "Hotspot"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md capitalize font-medium transition-colors ${
              filter === f
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredInsights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>

      {filteredInsights.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed rounded-lg bg-card">
          <LightbulbIcon className="h-10 w-10 text-muted-foreground/60 mb-3" />
          <h3 className="font-semibold text-sm">No insights in this category</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            Try selecting a different filter to view AI-generated insights.
          </p>
        </div>
      )}
    </div>
  );
}
