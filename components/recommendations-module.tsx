"use client";

import * as React from "react";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
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
import { mockRecommendations, Recommendation } from "@/lib/mockData";
import { toast } from "sonner";

interface RecommendationsModuleProps {
  onApply: () => void;
  dismissedIds: string[];
  onDismiss: (id: string) => void;
}

export function RecommendationsModule({
  onApply,
  dismissedIds,
  onDismiss,
}: RecommendationsModuleProps) {
  const [recommendations, setRecommendations] =
    React.useState<Recommendation[]>(mockRecommendations);
  const [applyingId, setApplyingId] = React.useState<string | null>(null);

  // Handle Apply recommendation
  const handleApply = (id: string, title: string) => {
    setApplyingId(id);

    // Simulate API call
    setTimeout(() => {
      setRecommendations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "Applied" } : r)),
      );
      setApplyingId(null);
      onApply(); // Notify parent to update potential savings KPIs
      toast.success(`Applied optimization: ${title}`);
    }, 1200);
  };

  // Handle Dismiss
  const handleDismiss = (id: string) => {
    onDismiss(id);
    toast.info("Recommendation dismissed from view.");
  };

  // Filter recommendations
  const activeRecommendations = recommendations.filter(
    (r) => r.status === "Active" && !dismissedIds.includes(r.id),
  );
  const appliedRecommendations = recommendations.filter(
    (r) => r.status === "Applied" || dismissedIds.includes(r.id), // count dismissed as complete/hidden for simulation
  );

  const getCategoryBadgeClass = (category: string) => {
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

  const getEffortBadgeClass = (effort: string) => {
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
    <div className="flex flex-col gap-6 p-4 lg:p-6 text-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl  tracking-tight">
            AI Optimization Recommendations
          </h2>
          <p className="text-xs text-muted-foreground">
            Get actionable recommendations backed by runtime profiling
            statistics to optimize software carbon footprint and reduce cloud
            overhead
          </p>
        </div>
        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 py-1 shrink-0 self-start md:self-auto "
        >
          {activeRecommendations.length} Actions Available
        </Badge>
      </div>

      {/* Grid of recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeRecommendations.map((rec) => (
          <Card
            key={rec.id}
            className="bg-card hover:border-emerald-500/20 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="outline"
                  className={`text-[9px] uppercase font-semibold ${getCategoryBadgeClass(rec.category)}`}
                >
                  {rec.category}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[9px] uppercase font-semibold ${getEffortBadgeClass(rec.effort)}`}
                >
                  Effort: {rec.effort}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase font-semibold bg-emerald-500/15 text-emerald-500 border-emerald-500/25 ml-auto"
                >
                  {rec.impact} Impact
                </Badge>
              </div>
              <CardTitle className="text-base  leading-tight">
                {rec.title}
              </CardTitle>
              <CardDescription className="text-[11px] font-mono mt-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                Target App: {rec.application}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {rec.description}
              </p>

              {/* ROI box */}
              <div className="mt-4 p-3 bg-muted/40 rounded-lg border border-border/50 grid grid-cols-3 gap-2 text-center font-mono">
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase ">
                    Monthly Cost
                  </div>
                  <div className="text-sm  text-emerald-500 mt-0.5">
                    {rec.estimatedSavingsCost > 0
                      ? `-$${rec.estimatedSavingsCost}`
                      : "$0.00"}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase ">
                    Monthly kWh
                  </div>
                  <div className="text-sm  text-foreground mt-0.5">
                    {rec.estimatedSavingskWh > 0
                      ? `-${rec.estimatedSavingskWh} kWh`
                      : "0 kWh"}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase ">
                    CO₂ Reduced
                  </div>
                  <div className="text-sm  text-foreground mt-0.5">
                    -{(rec.estimatedSavingsCarbon / 1000).toFixed(1)} kg
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2 pb-3 border-t border-border/20 flex gap-2 justify-end bg-muted/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(rec.id)}
                disabled={applyingId !== null}
                className="h-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                onClick={() => handleApply(rec.id, rec.title)}
                disabled={applyingId !== null}
                className="h-8    min-w-[80px]"
              >
                {applyingId === rec.id ? (
                  <>
                    <Loader2Icon className="h-3 w-3 mr-1.5 animate-spin" />
                    Applying
                  </>
                ) : (
                  "Apply Optimization"
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}

        {activeRecommendations.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center border border-dashed rounded-lg bg-card">
            <CheckCircle2Icon className="h-10 w-10 text-emerald-500 mb-3" />
            <h3 className="font-semibold text-sm">
              All optimizations applied!
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Your microservice energy usage is operating within optimal bounds.
              No pending regressions.
            </p>
          </div>
        )}
      </div>

      {/* Applied optimizations log */}
      {appliedRecommendations.length > 0 && (
        <Card className="mt-4 bg-muted/10 border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2Icon className="h-4 w-4 text-emerald-500" />
              Applied Optimization Log ({appliedRecommendations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {appliedRecommendations.map((rec) => (
              <div
                key={rec.id}
                className="flex justify-between items-center p-2 border border-border/40 rounded-lg bg-card text-muted-foreground font-medium"
              >
                <div>
                  <span className="font-semibold text-foreground">
                    {rec.title}
                  </span>
                  <span className="ml-2 font-mono text-[10px] bg-muted px-1 py-0.5 rounded text-muted-foreground">
                    Applied
                  </span>
                </div>
                <span className="font-mono text-[10px] text-emerald-500 ">
                  Saved ${rec.estimatedSavingsCost}/mo ·{" "}
                  {rec.estimatedSavingskWh} kWh
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
