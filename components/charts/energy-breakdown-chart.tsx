"use client";

import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface EnergyBreakdownChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  size?: number;
  innerRadius?: number;
  outerRadius?: number;
}

export function EnergyBreakdownChart({
  data,
  size = 160,
  innerRadius = 45,
  outerRadius = 70,
}: EnergyBreakdownChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase text-muted-foreground">Total</span>
          <span className="text-sm font-semibold tabular-nums">
            {total.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="size-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-muted-foreground">{item.name}</span>
            </div>
            <span className="font-semibold tabular-nums ml-2">
              {total > 0 ? Math.round((item.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
