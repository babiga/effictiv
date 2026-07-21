"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface ServiceDataPoint {
  service: string;
  application: string;
  color: string;
  metrics: {
    energy: number;
    carbon: number;
    cpu: number;
    memory: number;
    efficiency: number;
    cost: number;
  };
}

interface ServiceRadarChartProps {
  data: ServiceDataPoint[];
  height?: number;
}

const dimensions = [
  { key: "energy", label: "Energy" },
  { key: "carbon", label: "Carbon" },
  { key: "cpu", label: "CPU" },
  { key: "memory", label: "Memory" },
  { key: "efficiency", label: "Efficiency" },
  { key: "cost", label: "Cost" },
];

function normalizeValue(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((value / max) * 100);
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload: Record<string, unknown> }>;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border/60 bg-background/95 p-3 shadow-xl backdrop-blur-sm">
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="font-medium text-foreground">{entry.name}:</span>
          <span className="tabular-nums text-muted-foreground">
            {entry.value}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function ServiceRadarChart({
  data,
  height = 200,
}: ServiceRadarChartProps) {
  const maxValues = dimensions.reduce(
    (acc, dim) => {
      acc[dim.key] = Math.max(
        ...data.map((d) => d.metrics[dim.key as keyof typeof d.metrics]),
      );
      return acc;
    },
    {} as Record<string, number>,
  );

  const radarData = dimensions.map((dim) => {
    const point: Record<string, string | number> = { dimension: dim.label };
    data.forEach((service) => {
      const raw = service.metrics[dim.key as keyof typeof service.metrics];
      point[service.service] = normalizeValue(raw, maxValues[dim.key]);
    });
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid className="stroke-border/40" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
          tickCount={5}
        />
        {data.map((service) => (
          <Radar
            key={service.service}
            name={service.service}
            dataKey={service.service}
            stroke={service.color}
            fill={service.color}
            fillOpacity={0.1}
            strokeWidth={2}
          />
        ))}
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function computeRadarData(measurements: Array<{
  application: string;
  service: string;
  energyWh: number;
  cpuPercent: number;
  memoryMB: number;
  carbonIntensity: number;
  cost: number;
}>) {
  const grouped = measurements.reduce(
    (acc, m) => {
      const key = `${m.application}/${m.service}`;
      if (!acc[key]) {
        acc[key] = {
          service: m.service,
          application: m.application,
          energyWh: 0,
          carbonGrams: 0,
          cpuPercent: 0,
          memoryMB: 0,
          cost: 0,
          count: 0,
        };
      }
      acc[key].energyWh += m.energyWh;
      acc[key].carbonGrams += (m.energyWh * m.carbonIntensity) / 1000;
      acc[key].cpuPercent += m.cpuPercent;
      acc[key].memoryMB += m.memoryMB;
      acc[key].cost += m.cost;
      acc[key].count += 1;
      return acc;
    },
    {} as Record<string, {
      service: string;
      application: string;
      energyWh: number;
      carbonGrams: number;
      cpuPercent: number;
      memoryMB: number;
      cost: number;
      count: number;
    }>,
  );

  const services = Object.values(grouped)
    .map((g) => ({
      service: g.service,
      application: g.application,
      metrics: {
        energy: g.energyWh,
        carbon: g.carbonGrams,
        cpu: g.cpuPercent / g.count,
        memory: g.memoryMB / g.count,
        efficiency: 100 - (g.cpuPercent / g.count),
        cost: g.cost,
      },
    }))
    .sort((a, b) => b.metrics.energy - a.metrics.energy)
    .slice(0, 4);

  const colors = ["#ef4444", "#f97316", "#3b82f6", "#10b981"];

  return services.map((s, i) => ({
    ...s,
    color: colors[i],
  }));
}
