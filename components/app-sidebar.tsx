"use client";

import * as React from "react";
import {
  LayoutDashboardIcon,
  CpuIcon,
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
  LeafIcon,
} from "lucide-react";

import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const userMock = {
  name: "Khangal Hugo",
  email: "sarah.chen@effictiv.ai",
  avatar:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export function AppSidebar({
  activeTab,
  onSelectTab,
  ...props
}: AppSidebarProps) {
  const navigationGroups = [
    {
      label: "Core",
      items: [
        { title: "Dashboard", id: "dashboard", icon: LayoutDashboardIcon },
        { title: "Applications", id: "applications", icon: CpuIcon },
        { title: "Infrastructure", id: "infrastructure", icon: ServerIcon },
        { title: "Measurements", id: "measurements", icon: GaugeIcon },
      ],
    },
    {
      label: "Analysis",
      items: [
        { title: "Analytics", id: "analytics", icon: BarChart3Icon },
        { title: "Insights", id: "insights", icon: LightbulbIcon },
        { title: "Benchmarks", id: "benchmarks", icon: FlameIcon },
      ],
    },
    {
      label: "Optimization",
      items: [
        { title: "Recommendations", id: "recommendations", icon: SparklesIcon },
        { title: "Alerts", id: "alerts", icon: AlertTriangleIcon },
        { title: "Reports", id: "reports", icon: FileSpreadsheetIcon },
      ],
    },
    {
      label: "Management",
      items: [
        { title: "Integrations", id: "integrations", icon: PlugIcon },
        { title: "Team", id: "team", icon: UsersIcon },
        { title: "Settings", id: "settings", icon: SettingsIcon },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[slot=sidebar-menu-button]:!p-1.5 hover:bg-transparent active:bg-transparent focus-visible:ring-0"
              onClick={() => onSelectTab("dashboard")}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LeafIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate  tracking-tight text-foreground">
                  Effictiv
                </span>
                <span className="truncate text-[10px] text-muted-foreground font-medium">
                  Energy Intelligence
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navigationGroups.map((group, groupIdx) => (
          <React.Fragment key={group.label}>
            {groupIdx > 0 && <SidebarSeparator className="my-0" />}
            <SidebarGroup className="py-1">
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/50  px-2 mb-0.5">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => onSelectTab(item.id)}
                          tooltip={item.title}
                          isActive={isActive}
                          className="transition-colors duration-100"
                        >
                          <Icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </React.Fragment>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={userMock} />
      </SidebarFooter>
    </Sidebar>
  );
}
