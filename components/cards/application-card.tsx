"use client";

import { CpuIcon, LayersIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Application } from "@/lib/mockData";

interface ApplicationCardProps {
  application: Application;
  onClick?: () => void;
}

export function ApplicationCard({ application: app, onClick }: ApplicationCardProps) {
  const getLanguageBadge = (lang: string) => {
    switch (lang) {
      case "Go":
        return "bg-sky-500/10 text-sky-500 border-sky-500/20";
      case "Python":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
      case "TypeScript":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Rust":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "Java":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case "A":
        return "bg-emerald-500/20 text-emerald-500 border-emerald-500/30";
      case "B":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "C":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
      case "D":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "F":
        return "bg-rose-500/15 text-rose-500 border-rose-500/25";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "degraded":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "inactive":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:border-emerald-500/40 hover:shadow-md transition-all duration-200 bg-card group"
    >
      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1 pr-6">
          <CardTitle className="text-base group-hover:text-emerald-500 transition-colors">
            {app.name}
          </CardTitle>
          <CardDescription className="text-[11px] font-mono text-muted-foreground/80">
            {app.owner}
          </CardDescription>
        </div>
        <Badge
          variant="outline"
          className={`text-[18px] py-1.5 px-3 rounded-md shrink-0 ${getGradeBadge(app.energyScore)}`}
        >
          {app.energyScore}
        </Badge>
      </CardHeader>
      <CardContent className="pb-3 text-xs space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] uppercase font-semibold ${getLanguageBadge(app.language)}`}>
            {app.language}
          </Badge>
          <Badge variant="outline" className={`text-[10px] uppercase font-semibold capitalize ${getStatusBadge(app.status)}`}>
            {app.status}
          </Badge>
          <span className="text-[10px] text-muted-foreground font-mono ml-auto">
            {app.deploymentsCount} deploys
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-border/40 pt-3 tabular-nums">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Energy</div>
            <div className="text-sm text-foreground mt-0.5">{Math.round(app.energyUsagekWh)} kWh</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Carbon</div>
            <div className="text-sm text-foreground mt-0.5">{(app.carbonEmissionsGrams / 1000).toFixed(1)} kg</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Score</div>
            <div className="text-sm text-foreground mt-0.5">{app.energyScore}</div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 pb-3 border-t border-border/20 text-[10px] text-muted-foreground flex justify-between items-center bg-muted/20">
        <span className="flex items-center gap-1">
          <CpuIcon className="h-3 w-3 text-muted-foreground/60" />
          <span>CPU: {app.cpuAverage}%</span>
        </span>
        <span className="flex items-center gap-1">
          <LayersIcon className="h-3 w-3 text-muted-foreground/60" />
          <span>Mem: {app.memoryAverage}MB</span>
        </span>
      </CardFooter>
    </Card>
  );
}
