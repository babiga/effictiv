"use client";

import { motion } from "framer-motion";
import {
  ZapIcon,
  TreePineIcon,
  TrendingDownIcon,
  SparklesIcon,
  ArrowRightIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GreenScoreCard } from "@/components/cards/green-score-card";
import type { SustainabilitySummary } from "@/lib/mockData";

interface SustainabilitySummaryProps {
  summary: SustainabilitySummary;
  onNavigate?: (tab: string) => void;
}

export function SustainabilitySummaryHero({
  summary,
  onNavigate,
}: SustainabilitySummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.12] via-transparent to-blue-500/[0.03] p-5 lg:p-6"
    >
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        {/* Left: Narrative + Impact Metrics */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Sustainability Summary
            </span>
            <Badge
              variant="outline"
              className="text-[9px] border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
            >
              {summary.period}
            </Badge>
          </div>

          <p className="text-lg font-semibold text-foreground lg:text-xl">
            {summary.narrative}
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10">
                <ZapIcon className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div>
                <div className="text-sm font-bold tabular-nums text-foreground">
                  {summary.energyAvoidedKwh.toLocaleString()} kWh
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Energy avoided
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10">
                <TreePineIcon className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div>
                <div className="text-sm font-bold tabular-nums text-foreground">
                  {summary.carbonPreventedKg.toLocaleString()} kg CO₂e
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Carbon prevented
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10">
                <TrendingDownIcon className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div>
                <div className="text-sm font-bold tabular-nums text-foreground">
                  ~${summary.estimatedCostSavings.toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Infrastructure savings
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs text-muted-foreground">
              Green Score improved from{" "}
              <strong className="text-foreground">
                {summary.greenScorePrevious}
              </strong>{" "}
              →{" "}
              <strong className="text-emerald-500">
                {summary.greenScoreCurrent}
              </strong>
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              <strong className="text-foreground">
                {summary.optimizationsRemaining}
              </strong>{" "}
              optimization opportunities remain
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
            onClick={() => onNavigate?.("insights")}
          >
            <SparklesIcon className="h-3 w-3" />
            Explore Insights
            <ArrowRightIcon className="h-3 w-3" />
          </Button>
        </div>

        {/* Right: Green Score Gauge */}
        <div className="flex-shrink-0">
          <GreenScoreCard
            score={summary.greenScoreCurrent}
            previousScore={summary.greenScorePrevious}
            size="lg"
          />
        </div>
      </div>

      {/* Decorative gradient glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl" />
    </motion.div>
  );
}
