"use client";

import { motion } from "framer-motion";
import { SparklesIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InsightCard } from "@/components/cards/insight-card";
import type { Insight } from "@/lib/mockData";

interface EnhancedInsightsSectionProps {
  insights: Insight[];
  onNavigate?: (tab: string) => void;
}

export function EnhancedInsightsSection({
  insights,
  onNavigate,
}: EnhancedInsightsSectionProps) {
  const topInsights = insights.slice(0, 3);

  if (topInsights.length === 0) {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/20 p-8 text-center">
        <SparklesIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">
          No AI insights yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Insights will appear after collecting enough measurements from your
          services.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-purple-500" />
          <h3 className="text-base font-semibold">AI Sustainability Insights</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onNavigate?.("insights")}
        >
          View all insights
          <ArrowRightIcon className="h-3 w-3" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {topInsights.map((insight, idx) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
          >
            <InsightCard insight={insight} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
