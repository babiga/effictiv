"use client";

import * as React from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { CommandPalette } from "@/components/command-palette";

import { DashboardModule } from "@/components/dashboard-module";
import { ApplicationsModule } from "@/components/applications-module";
import { InfrastructureModule } from "@/components/infrastructure-module";
import { MeasurementsModule } from "@/components/measurements-module";
import { RecommendationsModule } from "@/components/recommendations-module";
import { AlertsModule } from "@/components/alerts-module";
import { AnalyticsModule } from "@/components/analytics-module";
import { InsightsModule } from "@/components/insights-module";
import { BenchmarksModule } from "@/components/benchmarks-module";
import { ReportsModule } from "@/components/reports-module";
import { DeploymentsModule } from "@/components/deployments-module";
import {
  IntegrationsModule,
  TeamModule,
  SettingsModule,
} from "@/components/other-modules";

export default function Page() {
  const [activeTab, setActiveTab] = React.useState("dashboard");
  const [environment, setEnvironment] = React.useState("all");
  const [timeRange, setTimeRange] = React.useState("30d");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);

  const [appliedCount, setAppliedCount] = React.useState(0);
  const [dismissedIds, setDismissedIds] = React.useState<string[]>([]);

  const handleApplyRecommendation = () => {
    setAppliedCount((prev) => prev + 1);
  };

  const handleDismissRecommendation = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  const handleSelectAppFromSearch = (appName: string) => {
    setSearchQuery(appName);
  };

  const renderModuleContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardModule
            timeRange={timeRange}
            environment={environment}
            appliedCount={appliedCount}
            onNavigate={(tab) => {
              setActiveTab(tab);
              setSearchQuery("");
            }}
          />
        );
      case "applications":
        return (
          <ApplicationsModule
            initialSearchQuery={searchQuery}
            onNavigate={(tab) => {
              setActiveTab(tab);
              setSearchQuery("");
            }}
          />
        );
      case "infrastructure":
        return <InfrastructureModule />;
      case "measurements":
        return <MeasurementsModule />;
      case "analytics":
        return <AnalyticsModule />;
      case "insights":
        return <InsightsModule />;
      case "deployments":
        return <DeploymentsModule />;
      case "benchmarks":
        return <BenchmarksModule />;
      case "recommendations":
        return (
          <RecommendationsModule
            onApply={handleApplyRecommendation}
            dismissedIds={dismissedIds}
            onDismiss={handleDismissRecommendation}
          />
        );
      case "alerts":
        return <AlertsModule />;
      case "reports":
        return <ReportsModule />;
      case "integrations":
        return <IntegrationsModule />;
      case "team":
        return <TeamModule />;
      case "settings":
        return <SettingsModule />;
      default:
        return (
          <div className="flex flex-1 items-center justify-center p-8 text-xs text-muted-foreground">
            Module {activeTab} coming soon.
          </div>
        );
    }
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSearchQuery("");
        }}
      />

      <SidebarInset className="bg-background flex flex-1 flex-col">
        <SiteHeader
          activeTab={activeTab}
          onSearchClick={() => setCommandPaletteOpen(true)}
          environment={environment}
          onEnvironmentChange={setEnvironment}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />

        <main className="flex flex-1 flex-col overflow-y-auto bg-neutral-50/50">
          {renderModuleContent()}
        </main>
      </SidebarInset>

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSearchQuery("");
        }}
        onSelectApp={handleSelectAppFromSearch}
      />
    </SidebarProvider>
  );
}
