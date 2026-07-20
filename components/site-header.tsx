"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { SearchIcon, MoonIcon, SunIcon, LaptopIcon } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SiteHeaderProps {
  activeTab: string;
  onSearchClick: () => void;
  environment: string;
  onEnvironmentChange: (val: any) => void;
  timeRange: string;
  onTimeRangeChange: (val: any) => void;
}

export function SiteHeader({
  activeTab,
  onSearchClick,
  environment,
  onEnvironmentChange,
  timeRange,
  onTimeRangeChange,
}: SiteHeaderProps) {
  const { setTheme } = useTheme();

  // Helper to group tabs into parent categories for breadcrumbs
  const getTabCategory = (tab: string) => {
    switch (tab) {
      case "dashboard":
      case "applications":
      case "infrastructure":
      case "measurements":
        return "Core";
      case "analytics":
      case "insights":
      case "benchmarks":
        return "Analysis";
      case "recommendations":
      case "alerts":
      case "reports":
        return "Optimization";
      case "integrations":
      case "team":
      case "settings":
        return "Management";
      default:
        return "System";
    }
  };

  return (
    <header className="flex h-(--header-height) shrink-0 items-center justify-between border-b bg-card/50 backdrop-blur-xs px-4 lg:px-6 transition-[width,height] ease-linear select-none">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto bg-border/60"
        />
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink
                href="#"
                className="text-muted-foreground/80 hover:text-foreground font-medium"
              >
                Effictiv
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span className="text-muted-foreground/60">
                {getTabCategory(activeTab)}
              </span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="capitalize text-foreground font-semibold">
                {activeTab}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-3">
        {/* Global Search command trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={onSearchClick}
          className="hidden md:flex h-8 w-44 items-center justify-between text-muted-foreground hover:text-foreground text-[11px] font-medium bg-muted/30 border-muted/50"
        >
          <span className="flex items-center gap-1.5">
            <SearchIcon className="h-3.5 w-3.5" />
            Search app...
          </span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[9px] font-medium text-muted-foreground opacity-100">
            <span>⌘</span>K
          </kbd>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onSearchClick}
          className="md:hidden h-8 w-8 text-muted-foreground border-muted/50"
        >
          <SearchIcon className="h-4 w-4" />
        </Button>

        {/* Global Filters: Environment */}
        <div className="hidden sm:block">
          <Select value={environment} onValueChange={onEnvironmentChange}>
            <SelectTrigger className="h-8 text-[11px] font-medium bg-muted/20 border-muted/50 w-28">
              <SelectValue placeholder="Environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[11px]">
                All Envs
              </SelectItem>
              <SelectItem value="production" className="text-[11px]">
                Production
              </SelectItem>
              <SelectItem value="staging" className="text-[11px]">
                Staging
              </SelectItem>
              <SelectItem value="development" className="text-[11px]">
                Development
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Global Filters: Time Range */}
        <div className="hidden sm:block">
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="h-8 text-[11px] font-medium bg-muted/20 border-muted/50 w-28">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d" className="text-[11px]">
                Last 7 days
              </SelectItem>
              <SelectItem value="30d" className="text-[11px]">
                Last 30 days
              </SelectItem>
              <SelectItem value="90d" className="text-[11px]">
                Last 90 days
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Theme Toggle dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-muted-foreground border-muted/50"
              >
                <SunIcon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <MoonIcon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            }
          />

          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem
              onClick={() => setTheme("light")}
              className="text-[11px] gap-2"
            >
              <SunIcon className="h-3.5 w-3.5" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("dark")}
              className="text-[11px] gap-2"
            >
              <MoonIcon className="h-3.5 w-3.5" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("system")}
              className="text-[11px] gap-2"
            >
              <LaptopIcon className="h-3.5 w-3.5" />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
