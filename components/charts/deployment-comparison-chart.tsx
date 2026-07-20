"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface ComparisonData {
  name: string;
  before: number;
  after: number;
}

interface DeploymentComparisonChartProps {
  data: ComparisonData[];
  height?: number;
  metricLabel?: string;
}

const config = {
  before: {
    label: "Before",
    color: "oklch(0.55 0.1 250)",
  },
  after: {
    label: "After",
    color: "oklch(0.627 0.194 149.251)",
  },
} satisfies ChartConfig;

export function DeploymentComparisonChart({
  data,
  height = 240,
  metricLabel = "Value",
}: DeploymentComparisonChartProps) {
  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <BarChart data={data} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
        <XAxis dataKey="name" className="text-[10px]" />
        <YAxis className="text-[10px]" />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <Legend
          content={({ payload }) => (
            <div className="flex justify-center gap-4 mt-2">
              {payload?.map((entry) => (
                <div key={entry.value} className="flex items-center gap-1.5 text-[10px]">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-muted-foreground">{entry.value}</span>
                </div>
              ))}
            </div>
          )}
        />
        <Bar dataKey="before" fill="var(--color-before)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="after" fill="var(--color-after)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
