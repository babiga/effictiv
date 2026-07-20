"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import {
  LayoutDashboardIcon,
  LayersIcon,
  ServerIcon,
  GaugeIcon,
  BarChart3Icon,
  LightbulbIcon,
  SparklesIcon,
  FlameIcon,
  FileSpreadsheetIcon,
  AlertTriangleIcon,
  PlugIcon,
  UsersIcon,
  SettingsIcon,
  LaptopIcon,
  MoonIcon,
  SunIcon,
  DownloadIcon,
  TerminalIcon,
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { mockApplications } from "@/lib/mockData"
import { toast } from "sonner"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTab: (tab: string) => void
  onSelectApp: (appName: string) => void
}

export function CommandPalette({
  open,
  onOpenChange,
  onSelectTab,
  onSelectApp,
}: CommandPaletteProps) {
  const { setTheme } = useTheme()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  const runCommand = (action: () => void) => {
    action()
    onOpenChange(false)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => onSelectTab("dashboard"))}>
            <LayoutDashboardIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSelectTab("applications"))}>
            <LayersIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Applications</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSelectTab("infrastructure"))}>
            <ServerIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Infrastructure</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSelectTab("measurements"))}>
            <GaugeIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Measurements</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSelectTab("analytics"))}>
            <BarChart3Icon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Analytics</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSelectTab("insights"))}>
            <LightbulbIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Insights</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSelectTab("recommendations"))}>
            <SparklesIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Recommendations</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSelectTab("benchmarks"))}>
            <FlameIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Benchmarks</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSelectTab("reports"))}>
            <FileSpreadsheetIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Reports</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSelectTab("alerts"))}>
            <AlertTriangleIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Alerts</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSelectTab("integrations"))}>
            <PlugIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Integrations</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSelectTab("team"))}>
            <UsersIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Team</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onSelectTab("settings"))}>
            <SettingsIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Go to Settings</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Applications">
          {mockApplications.map((app) => (
            <CommandItem
              key={app.id}
              onSelect={() =>
                runCommand(() => {
                  onSelectTab("applications")
                  onSelectApp(app.name)
                })
              }
            >
              <TerminalIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{app.name}</span>
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                Score {app.energyScore}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings & Themes">
          <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
            <SunIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Switch to Light Theme</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
            <MoonIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Switch to Dark Theme</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
            <LaptopIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Use System Theme</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() =>
              runCommand(() => {
                toast.success("ESG Carbon Report generated and queued for download.")
              })
            }
          >
            <DownloadIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Generate Monthly ESG Report</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
