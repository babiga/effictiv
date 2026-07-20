"use client";

import * as React from "react";
import { DownloadIcon, TreePineIcon, ZapIcon, BarChart3Icon, CalendarIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockReports } from "@/lib/mockData";
import { toast } from "sonner";

export function ReportsModule() {
  const [downloading, setDownloading] = React.useState(false);

  const handleGenerateReport = (type: string) => {
    setDownloading(true);
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
      loading: `Generating ${type} report...`,
      success: `${type} report ready for download.`,
      error: "Generation failed.",
    });
    setTimeout(() => setDownloading(false), 1500);
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case "weekly":
        return <CalendarIcon className="h-5 w-5 text-emerald-500" />;
      case "carbon":
        return <TreePineIcon className="h-5 w-5 text-emerald-500" />;
      case "engineering":
        return <ZapIcon className="h-5 w-5 text-blue-500" />;
      case "green-score":
        return <BarChart3Icon className="h-5 w-5 text-emerald-500" />;
      case "timeline":
        return <CalendarIcon className="h-5 w-5 text-purple-500" />;
      default:
        return <BarChart3Icon className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 text-xs">
      <div>
        <h2 className="text-xl tracking-tight">Sustainability Reports</h2>
        <p className="text-xs text-muted-foreground">
          Generate and download reports on your software&apos;s environmental impact and energy efficiency
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockReports.map((report) => (
          <Card key={report.id} className="flex flex-col bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                {getReportIcon(report.type)}
                <Badge variant="outline" className="text-[9px] uppercase font-semibold bg-muted text-muted-foreground">
                  {report.type.replace("-", " ")}
                </Badge>
              </div>
              <CardTitle className="text-base leading-tight">{report.title}</CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground font-mono">
                {new Date(report.date).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {report.summary}
              </p>

              <div className="grid grid-cols-2 gap-2 text-center font-mono">
                {report.metrics.energySaved !== undefined && report.metrics.energySaved > 0 && (
                  <div className="p-2 bg-emerald-500/[0.03] border border-emerald-500/15 rounded-lg">
                    <div className="text-[9px] text-muted-foreground uppercase">Energy Saved</div>
                    <div className="text-sm font-semibold text-emerald-500">{report.metrics.energySaved} kWh</div>
                  </div>
                )}
                {report.metrics.carbonAvoided !== undefined && report.metrics.carbonAvoided > 0 && (
                  <div className="p-2 bg-emerald-500/[0.03] border border-emerald-500/15 rounded-lg">
                    <div className="text-[9px] text-muted-foreground uppercase">Carbon Avoided</div>
                    <div className="text-sm font-semibold text-emerald-500">
                      {(report.metrics.carbonAvoided / 1000).toFixed(1)} kg
                    </div>
                  </div>
                )}
                {report.metrics.treesEquivalent !== undefined && report.metrics.treesEquivalent > 0 && (
                  <div className="p-2 bg-emerald-500/[0.03] border border-emerald-500/15 rounded-lg">
                    <div className="text-[9px] text-muted-foreground uppercase">Trees Equivalent</div>
                    <div className="text-sm font-semibold text-emerald-500">
                      {report.metrics.treesEquivalent} trees
                    </div>
                  </div>
                )}
                {report.metrics.efficiencyGain !== undefined && report.metrics.efficiencyGain > 0 && (
                  <div className="p-2 bg-blue-500/[0.03] border border-blue-500/15 rounded-lg">
                    <div className="text-[9px] text-muted-foreground uppercase">Efficiency Gain</div>
                    <div className="text-sm font-semibold text-blue-500">+{report.metrics.efficiencyGain}%</div>
                  </div>
                )}
                {report.metrics.measurementsCount !== undefined && report.metrics.measurementsCount > 0 && (
                  <div className="p-2 bg-muted/30 border border-border/50 rounded-lg col-span-2">
                    <div className="text-[9px] text-muted-foreground uppercase">Measurements Analyzed</div>
                    <div className="text-sm font-semibold">{report.metrics.measurementsCount.toLocaleString()}</div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/15 border-t py-3">
              <Button
                size="sm"
                onClick={() => handleGenerateReport(report.title)}
                disabled={downloading}
                className="w-full gap-1.5 h-8"
              >
                <DownloadIcon className="h-3.5 w-3.5" />
                Download Report
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
