"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface ResourceDistributionChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
  layout?: "horizontal" | "vertical";
}

const config = {
  value: {
    label: "Energy (Wh)",
    color: "oklch(0.627 0.194 149.251)",
  },
} satisfies ChartConfig;

export function ResourceDistributionChart({
  data,
  height = 200,
  layout = "horizontal",
}: ResourceDistributionChartProps) {
  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ left: layout === "vertical" ? -10 : 0, right: 10, top: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={layout === "horizontal"}
          vertical={layout === "vertical"}
          className="stroke-border/40"
        />
        {layout === "horizontal" ? (
          <>
            <XAxis dataKey="name" className="text-[10px]" />
            <YAxis className="text-[10px]" />
          </>
        ) : (
          <>
            <XAxis type="number" className="text-[10px]" />
            <YAxis dataKey="name" type="category" className="text-[10px]" width={80} />
          </>
        )}
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || "oklch(0.627 0.194 149.251)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
