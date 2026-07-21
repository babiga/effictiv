"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";

interface Deployment {
  date: string;
  version: string;
  status: "improved" | "regression" | "neutral";
  energyChangePercent: number;
}

interface EnergyTrendChartProps {
  data: Array<{ date: string; energy: number; carbon?: number; cost?: number }>;
  height?: number;
  showCarbon?: boolean;
  showCost?: boolean;
  deployments?: Deployment[];
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
  cost: {
    label: "Cost ($)",
    color: "oklch(0.72 0.16 55)",
  },
} satisfies ChartConfig;

function CustomTooltip({
  active,
  payload,
  label,
  deployments,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  deployments?: Deployment[];
}) {
  if (!active || !payload?.length) return null;

  const deploy = deployments?.find((d) => d.date === label);

  return (
    <div className="rounded-lg border border-border/60 bg-background/95 p-3 shadow-xl backdrop-blur-sm">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </div>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold tabular-nums text-foreground">
            {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
      {deploy && (
        <div className="mt-2 border-t border-border/40 pt-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                deploy.status === "improved"
                  ? "bg-emerald-500"
                  : deploy.status === "regression"
                    ? "bg-rose-500"
                    : "bg-muted-foreground"
              }`}
            />
            <span className="text-[11px] font-medium text-foreground">
              {deploy.version}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {deploy.status === "improved"
              ? `Energy decreased by ${Math.abs(deploy.energyChangePercent)}%`
              : deploy.status === "regression"
                ? `Energy increased by ${deploy.energyChangePercent}%`
                : "No significant energy change"}
          </p>
        </div>
      )}
    </div>
  );
}

export function EnergyTrendChart({
  data,
  height = 280,
  showCarbon = false,
  showCost = false,
  deployments = [],
}: EnergyTrendChartProps) {
  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height }}
    >
      <AreaChart
        data={data}
        margin={{ left: 12, right: 12, top: 8, bottom: 4 }}
      >
        <defs>
          <linearGradient id="fillEnergy" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-energy)"
              stopOpacity={0.2}
            />
            <stop
              offset="95%"
              stopColor="var(--color-energy)"
              stopOpacity={0.01}
            />
          </linearGradient>
          {showCarbon && (
            <linearGradient id="fillCarbon" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-carbon)"
                stopOpacity={0.15}
              />
              <stop
                offset="95%"
                stopColor="var(--color-carbon)"
                stopOpacity={0.01}
              />
            </linearGradient>
          )}
          {showCost && (
            <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-cost)"
                stopOpacity={0.15}
              />
              <stop
                offset="95%"
                stopColor="var(--color-cost)"
                stopOpacity={0.01}
              />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          className="stroke-border/40"
        />
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
          content={<CustomTooltip deployments={deployments} />}
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
        {showCost && (
          <Area
            name="Cost ($)"
            dataKey="cost"
            type="monotone"
            fill="url(#fillCost)"
            stroke="oklch(0.72 0.16 55)"
            strokeWidth={2}
          />
        )}
        {deployments.map((dep) => (
          <ReferenceLine
            key={dep.version}
            x={dep.date}
            stroke={
              dep.status === "improved"
                ? "oklch(0.627 0.194 149.251)"
                : dep.status === "regression"
                  ? "oklch(0.637 0.237 25.331)"
                  : "oklch(0.556 0 0)"
            }
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
        ))}
        {deployments.map((dep) => {
          const dataPoint = data.find((d) => d.date === dep.date);
          if (!dataPoint) return null;
          return (
            <ReferenceDot
              key={`dot-${dep.version}`}
              x={dep.date}
              y={dataPoint.energy}
              r={4}
              fill={
                dep.status === "improved"
                  ? "oklch(0.627 0.194 149.251)"
                  : dep.status === "regression"
                    ? "oklch(0.637 0.237 25.331)"
                    : "oklch(0.556 0 0)"
              }
              stroke="var(--background)"
              strokeWidth={2}
            />
          );
        })}
      </AreaChart>
    </ChartContainer>
  );
}
