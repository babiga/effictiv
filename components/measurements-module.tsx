"use client";

import * as React from "react";
import {
  GaugeIcon,
  DownloadIcon,
  ChevronDownIcon,
  SearchIcon,
  RefreshCwIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockMeasurements } from "@/lib/mockData";
import { toast } from "sonner";

function exportToCSVHelper(filteredData: typeof mockMeasurements) {
  const headers = [
    "Timestamp",
    "Application",
    "Service",
    "Energy (Wh)",
    "CPU (%)",
    "Memory (MB)",
    "Carbon (gCO2e)",
    "Cost ($)",
  ];
  const rows = filteredData.map((m) => [
    m.timestamp,
    m.application,
    m.service,
    m.energyWh,
    m.cpuPercent,
    m.memoryMB,
    m.carbonIntensity,
    m.cost,
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `effictiv_telemetry_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function MeasurementsModule() {
  const [data] = React.useState(mockMeasurements);
  const [selectedApp, setSelectedApp] = React.useState<string | null>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortField, setSortField] = React.useState<
    "timestamp" | "energyWh" | "cpuPercent" | "cost"
  >("timestamp");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 6;

  // Unique apps for dropdown
  const uniqueApps = Array.from(
    new Set(mockMeasurements.map((m) => m.application)),
  );

  // Handle Refresh simulation
  const simulateRefresh = () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 800)), {
      loading: "Fetching latest Kubernetes Kepler measurements...",
      success: "Telemetry dataset updated to latest commit runs.",
      error: "Failed to query telemetry agents.",
    });
  };

  // Handle CSV export simulation
  const handleExport = () => {
    exportToCSVHelper(filteredData);
    toast.success("CSV export download started.");
  };

  // Filter and Sort
  const filteredData = data
    .filter((m) => {
      const matchesApp = selectedApp === "all" || m.application === selectedApp;
      const matchesSearch =
        m.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.application.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.machineType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesApp && matchesSearch;
    })
    .sort((a, b) => {
      if (sortField === "timestamp") {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }
      if (sortField === "energyWh") {
        return sortOrder === "asc"
          ? a.energyWh - b.energyWh
          : b.energyWh - a.energyWh;
      }
      if (sortField === "cpuPercent") {
        return sortOrder === "asc"
          ? a.cpuPercent - b.cpuPercent
          : b.cpuPercent - a.cpuPercent;
      }
      if (sortField === "cost") {
        return sortOrder === "asc" ? a.cost - b.cost : b.cost - a.cost;
      }
      return 0;
    });

  // Paginated chunk
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 text-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl  tracking-tight">Granular Measurements Log</h2>
          <p className="text-xs text-muted-foreground">
            View trace telemetry collected directly from virtual nodes and
            process cgroups
          </p>
        </div>
        <div className="flex gap-2 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={simulateRefresh}
            className="h-8 gap-1.5"
          >
            <RefreshCwIcon className="h-3.5 w-3.5" />
            Sync Telemetry
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-8 gap-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by component service or instance..."
            className="pl-9 bg-card w-full"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="w-full sm:w-48 shrink-0">
          <Select
            value={selectedApp}
            onValueChange={(value) => {
              setSelectedApp(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="All Applications" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Applications</SelectItem>
              {uniqueApps.map((app) => (
                <SelectItem key={app} value={app}>
                  {app}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Card */}
      <Card className="bg-card">
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold">
            Micro-Measurements Repository
          </CardTitle>
          <CardDescription className="text-xs">
            Reflecting runtime container processes, power consumption in
            milliwatts, and CO2 outputs.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground font-semibold uppercase text-[10px]">
                  <th
                    className="py-2.5 cursor-pointer hover:text-foreground select-none"
                    onClick={() => toggleSort("timestamp")}
                  >
                    Timestamp{" "}
                    {sortField === "timestamp" &&
                      (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th className="py-2.5">Application</th>
                  <th className="py-2.5">Component Service</th>
                  <th
                    className="py-2.5 text-right cursor-pointer hover:text-foreground select-none"
                    onClick={() => toggleSort("energyWh")}
                  >
                    Energy (Wh){" "}
                    {sortField === "energyWh" &&
                      (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    className="py-2.5 text-right cursor-pointer hover:text-foreground select-none"
                    onClick={() => toggleSort("cpuPercent")}
                  >
                    CPU (%){" "}
                    {sortField === "cpuPercent" &&
                      (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th className="py-2.5 text-right">Memory (MB)</th>
                  <th className="py-2.5 text-right">CO₂ Intensity</th>
                  <th
                    className="py-2.5 text-right cursor-pointer hover:text-foreground select-none"
                    onClick={() => toggleSort("cost")}
                  >
                    Cost ($){" "}
                    {sortField === "cost" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th className="py-2.5 text-right">VM Instance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {paginatedData.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <td className="py-3 font-mono text-[10px] text-muted-foreground">
                      {new Date(m.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 font-semibold">{m.application}</td>
                    <td className="py-3">
                      <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-medium text-foreground">
                        {m.service}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-emerald-500 ">
                      {m.energyWh} Wh
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums">
                      {m.cpuPercent}%
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums">
                      {m.memoryMB} MB
                    </td>
                    <td className="py-3 text-right text-muted-foreground font-mono tabular-nums">
                      {m.carbonIntensity} g/kWh
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-foreground/80">
                      ${m.cost.toFixed(4)}
                    </td>
                    <td className="py-3 text-right font-mono text-[10px] text-muted-foreground">
                      {m.machineType}
                    </td>
                  </tr>
                ))}

                {paginatedData.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-8 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <GaugeIcon className="h-8 w-8 text-muted-foreground/50" />
                        <span>
                          No telemetry records found matching search filters.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/20 pt-4 mt-2">
              <span className="text-muted-foreground text-[10px]">
                Showing page {currentPage} of {totalPages} (
                {filteredData.length} records total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="h-7 px-2"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="h-7 px-2"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
