"use client";

import { SparklesIcon, TreePineIcon } from "lucide-react";
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
import type { Insight } from "@/lib/mockData";

interface InsightCardProps {
  insight: Insight;
  onInvestigate?: () => void;
}

export function InsightCard({ insight, onInvestigate }: InsightCardProps) {
  const typeConfig = {
    Regression: {
      badge: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      icon: "text-rose-500",
    },
    Optimization: {
      badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      icon: "text-emerald-500",
    },
    Hotspot: {
      badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      icon: "text-blue-500",
    },
  };

  const config = typeConfig[insight.type];

  return (
    <Card className="bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className={`text-[9px] uppercase font-semibold ${config.badge}`}>
            {insight.type}
          </Badge>
          <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground">
            {insight.application}
          </Badge>
          <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground ml-auto">
            {insight.confidence}% confidence
          </Badge>
        </div>
        <CardTitle className="text-base leading-tight">{insight.title}</CardTitle>
        <CardDescription className="text-[10px] text-muted-foreground font-mono">
          Detected {new Date(insight.timestamp).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {insight.description}
        </p>

        {insight.affectedServices.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {insight.affectedServices.map((service) => (
              <Badge
                key={service}
                variant="outline"
                className="text-[9px] bg-muted/50 text-muted-foreground font-mono"
              >
                {service}
              </Badge>
            ))}
          </div>
        )}

        {insight.environmentalImpact.energySavedWh > 0 && (
          <div className="p-2.5 bg-emerald-500/[0.03] border border-emerald-500/15 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <TreePineIcon className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] font-semibold text-emerald-500 uppercase">
                Environmental Impact
              </span>
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span>
                Energy: <strong className="text-foreground">{insight.environmentalImpact.energySavedWh.toLocaleString()} Wh</strong>
              </span>
              <span>
                Carbon: <strong className="text-foreground">{(insight.environmentalImpact.carbonSavedGrams / 1000).toFixed(1)} kg</strong>
              </span>
              <span>
                ≈ <strong className="text-emerald-500">{insight.environmentalImpact.treesEquivalent} trees</strong> for a year
              </span>
            </div>
          </div>
        )}
      </CardContent>
      {onInvestigate && (
        <CardFooter className="pt-0 justify-end">
          <Button variant="link" size="sm" className="text-emerald-500 text-xs" onClick={onInvestigate}>
            Investigate
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
