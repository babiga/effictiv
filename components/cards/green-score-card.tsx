"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface GreenScoreCardProps {
  score: number;
  previousScore?: number;
  size?: "sm" | "md" | "lg";
}

export function GreenScoreCard({
  score,
  previousScore,
  size = "md",
}: GreenScoreCardProps) {
  const change = previousScore ? score - previousScore : 0;
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  const getScoreColor = (s: number) => {
    if (s >= 80)
      return {
        stroke: "#10b981",
        text: "text-emerald-500",
        bg: "bg-emerald-500/10",
      };
    if (s >= 60)
      return {
        stroke: "#eab308",
        text: "text-yellow-500",
        bg: "bg-yellow-500/10",
      };
    return {
      stroke: "#f97316",
      text: "text-orange-500",
      bg: "bg-orange-500/10",
    };
  };

  const colors = getScoreColor(score);

  const getGrade = (s: number) => {
    if (s >= 90) return "A+";
    if (s >= 80) return "A";
    if (s >= 70) return "B";
    if (s >= 60) return "C";
    return "D";
  };

  const sizeMap = {
    sm: { ring: 64, text: "text-xl", strokeWidth: 5 },
    md: { ring: 88, text: "text-3xl", strokeWidth: 6 },
    lg: { ring: 120, text: "text-4xl", strokeWidth: 7 },
  };

  const s = sizeMap[size];

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardDescription className="text-[10px] uppercase font-semibold text-muted-foreground">
          Green Score
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div
          className="relative flex-shrink-0"
          style={{ width: s.ring, height: s.ring }}
        >
          <svg
            width={s.ring}
            height={s.ring}
            viewBox="0 0 80 80"
            className="-rotate-90"
          >
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="currentColor"
              strokeWidth={s.strokeWidth}
              className="text-muted/30"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke={colors.stroke}
              strokeWidth={s.strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`${s.text} font-bold tabular-nums ${colors.text}`}>
              {score}
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              Grade {getGrade(score)}
            </span>
            {change !== 0 && (
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  change > 0
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-rose-500/10 text-rose-500"
                }`}
              >
                {change > 0 ? "+" : ""}
                {change}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {score >= 80
              ? "Your software is running efficiently"
              : score >= 60
                ? "Room for improvement detected"
                : "Significant optimization opportunities exist"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
