"use client";

import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GreenScore as GreenScoreType } from "@/lib/mockData";

interface GreenScoreChartProps {
  history: GreenScoreType[];
  currentScore: number;
}

export function GreenScoreChart({ history, currentScore }: GreenScoreChartProps) {
  const recentScores = history.slice(-14);
  const previousScore = recentScores[0]?.score || 0;
  const change = currentScore - previousScore;
  const isPositive = change >= 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-rose-500";
  };

  const getGrade = (score: number) => {
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    if (score >= 50) return "D";
    return "F";
  };

  return (
    <Card className="bg-card">
      <CardHeader className="pb-2">
        <CardDescription className="text-[10px] uppercase font-semibold text-muted-foreground">
          Green Score
        </CardDescription>
        <div className="flex items-baseline gap-2">
          <CardTitle className={`text-3xl tabular-nums ${getScoreColor(currentScore)}`}>
            {currentScore}
          </CardTitle>
          <span className="text-xs text-muted-foreground">/100</span>
          <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded">
            Grade {getGrade(currentScore)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-1.5 text-xs mb-4">
          {isPositive ? (
            <TrendingUpIcon className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <TrendingDownIcon className="h-3.5 w-3.5 text-rose-500" />
          )}
          <span className={isPositive ? "text-emerald-500" : "text-rose-500"}>
            {isPositive ? "+" : ""}{change} points this period
          </span>
        </div>
        <div className="flex items-end gap-[3px] h-16">
          {recentScores.map((entry, i) => {
            const height = (entry.score / 100) * 100;
            return (
              <div
                key={entry.id}
                className="flex-1 rounded-sm transition-all"
                style={{
                  height: `${height}%`,
                  backgroundColor:
                    entry.score >= 80
                      ? "oklch(0.627 0.194 149.251)"
                      : entry.score >= 60
                        ? "oklch(0.75 0.15 85)"
                        : "oklch(0.65 0.2 25)",
                  opacity: i === recentScores.length - 1 ? 1 : 0.4 + (i / recentScores.length) * 0.6,
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
          <span>14 days ago</span>
          <span>Today</span>
        </div>
      </CardContent>
    </Card>
  );
}
