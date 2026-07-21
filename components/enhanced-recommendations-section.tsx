"use client";

import { motion } from "framer-motion";
import { LightbulbIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecommendationCard } from "@/components/cards/recommendation-card";
import type { Recommendation } from "@/lib/mockData";

interface EnhancedRecommendationsSectionProps {
  recommendations: Recommendation[];
  onApply?: (id: string) => void;
  onDismiss?: (id: string) => void;
  applyingId?: string | null;
  onNavigate?: (tab: string) => void;
}

export function EnhancedRecommendationsSection({
  recommendations,
  onApply,
  onDismiss,
  applyingId,
  onNavigate,
}: EnhancedRecommendationsSectionProps) {
  const activeRecs = recommendations
    .filter((r) => r.status === "Active")
    .sort((a, b) => b.estimatedSavingskWh - a.estimatedSavingskWh)
    .slice(0, 3);

  if (activeRecs.length === 0) {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/20 p-8 text-center">
        <LightbulbIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">
          All optimizations applied
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Great work! New recommendations will appear as more measurements are
          collected.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LightbulbIcon className="h-4 w-4 text-amber-500" />
          <h3 className="text-base font-semibold">
            Optimization Opportunities
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onNavigate?.("recommendations")}
        >
          View all recommendations
          <ArrowRightIcon className="h-3 w-3" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeRecs.map((rec, idx) => (
          <motion.div
            key={rec.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
          >
            <RecommendationCard
              recommendation={rec}
              onApply={onApply}
              onDismiss={onDismiss}
              isApplying={applyingId === rec.id}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
