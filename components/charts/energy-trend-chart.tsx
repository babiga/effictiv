"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface EnergyTrendChartProps {
  data: Array<{ date: string; energy: number; carbon?: number }>;
  height?: number;
  showCarbon?: boolean;
}

const config = {
  energy: {
    label: "Energy (kWh)",
    color: "oklch(0.627 0.194 149.251)",
  },
  carbon: {
    label: "Carbon (gCO₂e)",
    color: "oklch(0.65 0.15 250)",
  },
} satisfies ChartConfig;

export function EnergyTrendChart({
  data,
  height = 280,
  showCarbon = false,
}: EnergyTrendChartProps) {
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <AreaChart data={data} margin={{ left: 12, right: 12, top: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="fillEnergy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-energy)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--color-energy)" stopOpacity={0.01} />
          </linearGradient>
          {showCarbon && (
            <linearGradient id="fillCarbon" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-carbon)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--color-carbon)" stopOpacity={0.01} />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          className="text-xs text-muted-foreground"
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <Area
          name="Energy (kWh)"
          dataKey="energy"
          type="monotone"
          fill="url(#fillEnergy)"
          stroke="oklch(0.627 0.194 149.251)"
          strokeWidth={2}
        />
        {showCarbon && (
          <Area
            name="Carbon (gCO₂e)"
            dataKey="carbon"
            type="monotone"
            fill="url(#fillCarbon)"
            stroke="oklch(0.65 0.15 250)"
            strokeWidth={2}
          />
        )}
      </AreaChart>
    </ChartContainer>
  );
}
