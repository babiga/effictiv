"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MeasurementsModule } from "@/components/measurements-module";
import { BenchmarksModule } from "@/components/benchmarks-module";
import { RecommendationsModule } from "@/components/recommendations-module";

const tabs = ["Measurements", "Benchmarks", "Recommendations"] as const;

export function PilotTabs() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Measurements");
  const [dismissed, setDismissed] = useState<string[]>([]);

  return (
    <div className="mx-auto max-w-7xl">
      <nav aria-label="Pilot sections" className="flex flex-wrap gap-2 px-4 pt-5 lg:px-6">
        {tabs.map((name) => (
          <Button key={name} variant={name === tab ? "default" : "outline"} aria-pressed={tab === name} onClick={() => setTab(name)}>{name}</Button>
        ))}
      </nav>
      {tab === "Measurements" && <MeasurementsModule />}
      {tab === "Benchmarks" && <BenchmarksModule />}
      {tab === "Recommendations" && (
        <RecommendationsModule dismissedIds={dismissed} onDismiss={(id) => setDismissed((previous) => [...previous, id])} />
      )}
    </div>
  );
}
