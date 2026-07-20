"use client";

import { LeafIcon, ZapIcon, TreePineIcon } from "lucide-react";
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
import type { Recommendation } from "@/lib/mockData";

interface RecommendationCardProps {
  recommendation: Recommendation;
  onApply?: (id: string) => void;
  onDismiss?: (id: string) => void;
  isApplying?: boolean;
}

export function RecommendationCard({
  recommendation: rec,
  onApply,
  onDismiss,
  isApplying = false,
}: RecommendationCardProps) {
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "Infrastructure":
        return "bg-sky-500/10 text-sky-500 border-sky-500/20";
      case "Code":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "Database":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Scheduling":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getEffortBadge = (effort: string) => {
    switch (effort) {
      case "Low":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "Medium":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "High":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="bg-card hover:border-emerald-500/20 hover:shadow-xs transition-all flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className={`text-[9px] uppercase font-semibold ${getCategoryBadge(rec.category)}`}>
            {rec.category}
          </Badge>
          <Badge variant="outline" className={`text-[9px] uppercase font-semibold ${getEffortBadge(rec.effort)}`}>
            Effort: {rec.effort}
          </Badge>
          <Badge
            variant="outline"
            className="text-[9px] uppercase font-semibold bg-emerald-500/15 text-emerald-500 border-emerald-500/25 ml-auto"
          >
            {rec.impact} Impact
          </Badge>
        </div>
        <CardTitle className="text-base leading-tight">{rec.title}</CardTitle>
        <CardDescription className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
          Target: {rec.application}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
          {rec.description}
        </p>
        <div className="p-3 bg-muted/40 rounded-lg border border-border/50 grid grid-cols-3 gap-2 text-center font-mono">
          <div>
            <div className="flex items-center justify-center gap-1 text-[9px] text-muted-foreground uppercase mb-0.5">
              <ZapIcon className="h-2.5 w-2.5" />
              Energy
            </div>
            <div className="text-sm font-semibold text-emerald-500">
              {rec.estimatedSavingskWh > 0 ? `-${rec.estimatedSavingskWh}` : "0"} kWh
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-[9px] text-muted-foreground uppercase mb-0.5">
              <TreePineIcon className="h-2.5 w-2.5" />
              Carbon
            </div>
            <div className="text-sm font-semibold text-foreground">
              -{(rec.estimatedSavingsCarbon / 1000).toFixed(1)} kg
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-[9px] text-muted-foreground uppercase mb-0.5">
              <LeafIcon className="h-2.5 w-2.5" />
              Impact
            </div>
            <div className="text-sm font-semibold text-emerald-500">
              {rec.estimatedSavingsCarbon > 100000
                ? "High"
                : rec.estimatedSavingsCarbon > 50000
                  ? "Medium"
                  : "Low"}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 pb-3 border-t border-border/20 flex gap-2 justify-end bg-muted/20">
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(rec.id)}
            disabled={isApplying}
            className="h-8 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            Dismiss
          </Button>
        )}
        {onApply && (
          <Button
            size="sm"
            onClick={() => onApply(rec.id)}
            disabled={isApplying}
            className="h-8 min-w-[80px]"
          >
            {isApplying ? "Applying..." : "Apply"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
