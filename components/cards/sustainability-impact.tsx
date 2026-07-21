"use client";

import { motion } from "framer-motion";
import { TreePineIcon, CarIcon, HomeIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SustainabilitySummary } from "@/lib/mockData";

interface SustainabilityImpactProps {
  impact: SustainabilitySummary["impact"];
  carbonPreventedKg: number;
}

export function SustainabilityImpact({
  impact,
  carbonPreventedKg,
}: SustainabilityImpactProps) {
  const items = [
    {
      icon: TreePineIcon,
      value: impact.treesEquivalent,
      unit: "trees",
      label: "absorbing CO₂ for one year",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      icon: CarIcon,
      value: impact.drivingKmAvoided.toLocaleString(),
      unit: "km",
      label: "of driving avoided",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: HomeIcon,
      value: impact.homeElectricityMonths,
      unit: "months",
      label: "of home electricity",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Real-World Impact
          </CardTitle>
          <CardDescription className="text-xs">
            Your carbon reduction of {carbonPreventedKg.toLocaleString()} kg
            CO₂e is equivalent to
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <div className="text-lg font-bold tabular-nums text-foreground">
                      {item.value}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        {item.unit}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {item.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground italic">
            Estimates based on EPA averages and international carbon conversion
            factors. Actual impact may vary by region and energy source.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
