export interface Application {
  id: string;
  name: string;
  language: "Go" | "TypeScript" | "Python" | "Rust" | "Java";
  environment: "production" | "staging" | "development";
  energyScore: "A" | "B" | "C" | "D" | "E" | "F";
  energyUsagekWh: number;
  energyCost: number;
  carbonEmissionsGrams: number;
  potentialSavingsCost: number;
  activeAlertsCount: number;
  cpuAverage: number;
  memoryAverage: number;
  deploymentsCount: number;
  owner: string;
  status: "active" | "inactive" | "degraded";
}

export interface Measurement {
  id: string;
  timestamp: string;
  application: string;
  service: string;
  energyWh: number;
  cpuPercent: number;
  memoryMB: number;
  carbonIntensity: number; // g CO2e / kWh
  machineType: string;
  cost: number;
  durationMs: number;
}

export interface Recommendation {
  id: string;
  category: "Infrastructure" | "Code" | "Database" | "Scheduling";
  title: string;
  description: string;
  application: string;
  effort: "Low" | "Medium" | "High";
  impact: "Low" | "Medium" | "High";
  estimatedSavingsCost: number; // Monthly USD
  estimatedSavingskWh: number; // Monthly kWh
  estimatedSavingsCarbon: number; // Monthly grams
  status: "Active" | "Applied" | "Dismissed";
}

export interface Alert {
  id: string;
  severity: "Critical" | "Warning" | "Info";
  title: string;
  description: string;
  application: string;
  value: string;
  threshold: string;
  timestamp: string;
  status: "Active" | "Acknowledged" | "Resolved";
}

export interface Insight {
  id: string;
  type: "Hotspot" | "Regression" | "Optimization";
  title: string;
  description: string;
  timestamp: string;
  application: string;
  severity: "High" | "Medium" | "Low";
}

// Generate Mock Data
export const mockApplications: Application[] = [
  {
    id: "app-1",
    name: "auth-service",
    language: "Go",
    environment: "production",
    energyScore: "A",
    energyUsagekWh: 124.5,
    energyCost: 18.68,
    carbonEmissionsGrams: 47310,
    potentialSavingsCost: 2.50,
    activeAlertsCount: 0,
    cpuAverage: 12.4,
    memoryAverage: 256,
    deploymentsCount: 18,
    owner: "Identity Team",
    status: "active",
  },
  {
    id: "app-2",
    name: "data-pipeline",
    language: "Python",
    environment: "production",
    energyScore: "D",
    energyUsagekWh: 1892.4,
    energyCost: 283.86,
    carbonEmissionsGrams: 719112,
    potentialSavingsCost: 95.40,
    activeAlertsCount: 2,
    cpuAverage: 78.5,
    memoryAverage: 4096,
    deploymentsCount: 8,
    owner: "Data Platform",
    status: "degraded",
  },
  {
    id: "app-3",
    name: "payment-gateway",
    language: "TypeScript",
    environment: "production",
    energyScore: "B",
    energyUsagekWh: 210.8,
    energyCost: 31.62,
    carbonEmissionsGrams: 80104,
    potentialSavingsCost: 5.20,
    activeAlertsCount: 0,
    cpuAverage: 18.2,
    memoryAverage: 512,
    deploymentsCount: 24,
    owner: "Checkout Team",
    status: "active",
  },
  {
    id: "app-4",
    name: "image-processor",
    language: "Rust",
    environment: "production",
    energyScore: "A",
    energyUsagekWh: 85.3,
    energyCost: 12.80,
    carbonEmissionsGrams: 32414,
    potentialSavingsCost: 0.00,
    activeAlertsCount: 0,
    cpuAverage: 8.7,
    memoryAverage: 128,
    deploymentsCount: 5,
    owner: "Media Core",
    status: "active",
  },
  {
    id: "app-5",
    name: "search-indexer",
    language: "Java",
    environment: "production",
    energyScore: "F",
    energyUsagekWh: 2450.1,
    energyCost: 367.52,
    carbonEmissionsGrams: 931038,
    potentialSavingsCost: 145.00,
    activeAlertsCount: 1,
    cpuAverage: 82.1,
    memoryAverage: 8192,
    deploymentsCount: 4,
    owner: "Search Platform",
    status: "active",
  },
  {
    id: "app-6",
    name: "recommendation-engine",
    language: "Python",
    environment: "staging",
    energyScore: "C",
    energyUsagekWh: 420.5,
    energyCost: 63.08,
    carbonEmissionsGrams: 159790,
    potentialSavingsCost: 15.00,
    activeAlertsCount: 1,
    cpuAverage: 45.3,
    memoryAverage: 2048,
    deploymentsCount: 12,
    owner: "ML Ops",
    status: "active",
  },
  {
    id: "app-7",
    name: "notification-dispatcher",
    language: "TypeScript",
    environment: "development",
    energyScore: "B",
    energyUsagekWh: 12.4,
    energyCost: 1.86,
    carbonEmissionsGrams: 4712,
    potentialSavingsCost: 0.00,
    activeAlertsCount: 0,
    cpuAverage: 4.2,
    memoryAverage: 192,
    deploymentsCount: 32,
    owner: "Comms Team",
    status: "active",
  },
];

// Reconstruct dates relative to now for measurements
const baseDate = new Date();
const subtractDays = (days: number) => {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

export const mockMeasurements: Measurement[] = [
  {
    id: "m-1",
    timestamp: subtractDays(0),
    application: "data-pipeline",
    service: "etl-batch",
    energyWh: 4520,
    cpuPercent: 82.5,
    memoryMB: 4096,
    carbonIntensity: 395,
    machineType: "m5.2xlarge",
    cost: 0.678,
    durationMs: 3600000,
  },
  {
    id: "m-2",
    timestamp: subtractDays(0),
    application: "auth-service",
    service: "token-sign",
    energyWh: 12,
    cpuPercent: 14.1,
    memoryMB: 256,
    carbonIntensity: 380,
    machineType: "t3.medium",
    cost: 0.0018,
    durationMs: 10000,
  },
  {
    id: "m-3",
    timestamp: subtractDays(1),
    application: "search-indexer",
    service: "reindex-all",
    energyWh: 8900,
    cpuPercent: 91.2,
    memoryMB: 8192,
    carbonIntensity: 420,
    machineType: "c5.4xlarge",
    cost: 1.335,
    durationMs: 7200000,
  },
  {
    id: "m-4",
    timestamp: subtractDays(1),
    application: "payment-gateway",
    service: "stripe-charge",
    energyWh: 45,
    cpuPercent: 21.4,
    memoryMB: 512,
    carbonIntensity: 375,
    machineType: "t3.medium",
    cost: 0.0067,
    durationMs: 35000,
  },
  {
    id: "m-5",
    timestamp: subtractDays(2),
    application: "image-processor",
    service: "thumbnail-gen",
    energyWh: 8,
    cpuPercent: 5.6,
    memoryMB: 128,
    carbonIntensity: 220, // clean grid energy!
    machineType: "t3.small",
    cost: 0.0012,
    durationMs: 8000,
  },
  {
    id: "m-6",
    timestamp: subtractDays(3),
    application: "recommendation-engine",
    service: "train-model",
    energyWh: 3200,
    cpuPercent: 65.4,
    memoryMB: 2048,
    carbonIntensity: 385,
    machineType: "g4dn.xlarge",
    cost: 0.48,
    durationMs: 1800000,
  },
  {
    id: "m-7",
    timestamp: subtractDays(4),
    application: "data-pipeline",
    service: "aggregate-db",
    energyWh: 2100,
    cpuPercent: 74.2,
    memoryMB: 4096,
    carbonIntensity: 410,
    machineType: "m5.xlarge",
    cost: 0.315,
    durationMs: 1800000,
  },
  {
    id: "m-8",
    timestamp: subtractDays(5),
    application: "auth-service",
    service: "validate-session",
    energyWh: 3,
    cpuPercent: 8.5,
    memoryMB: 256,
    carbonIntensity: 390,
    machineType: "t3.medium",
    cost: 0.00045,
    durationMs: 2500,
  },
];

export const mockRecommendations: Recommendation[] = [
  {
    id: "rec-1",
    category: "Infrastructure",
    title: "Downsize underutilized search-indexer instances",
    description: "The search-indexer uses c5.4xlarge instances but CPU utilization averages below 15% except during nightly builds. Downsizing to c5.xlarge or enabling auto-scaling will save significant energy.",
    application: "search-indexer",
    effort: "Low",
    impact: "High",
    estimatedSavingsCost: 120.00,
    estimatedSavingskWh: 800,
    estimatedSavingsCarbon: 304000,
    status: "Active",
  },
  {
    id: "rec-2",
    category: "Code",
    title: "Optimize serialization loop in data-pipeline",
    description: "Flamegraphs show 42% of CPU time spent in json.Unmarshal inside telemetry loops. Rewriting in Go or using protocol buffers will decrease execution time and energy burn.",
    application: "data-pipeline",
    effort: "Medium",
    impact: "High",
    estimatedSavingsCost: 75.00,
    estimatedSavingskWh: 500,
    estimatedSavingsCarbon: 190000,
    status: "Active",
  },
  {
    id: "rec-3",
    category: "Scheduling",
    title: "Reschedule recommendation training to carbon-low periods",
    description: "ML model training currently runs at 2:00 PM when grid carbon intensity is 450 gCO2e/kWh. Rescheduling to 2:00 AM (wind/solar surplus) drops intensity to 180 gCO2e/kWh, reducing total carbon footprint by 60% without code changes.",
    application: "recommendation-engine",
    effort: "Low",
    impact: "Medium",
    estimatedSavingsCost: 0.00,
    estimatedSavingskWh: 0,
    estimatedSavingsCarbon: 86400,
    status: "Active",
  },
  {
    id: "rec-4",
    category: "Database",
    title: "Enable caching for redundant token validation queries",
    description: "auth-service makes 120,000 DB queries/min for active sessions. Adding a Redis layer will cut database node energy consumption by 35%.",
    application: "auth-service",
    effort: "High",
    impact: "Medium",
    estimatedSavingsCost: 45.00,
    estimatedSavingskWh: 300,
    estimatedSavingsCarbon: 114000,
    status: "Active",
  },
];

export const mockAlerts: Alert[] = [
  {
    id: "alert-1",
    severity: "Critical",
    title: "Carbon regression detected in data-pipeline",
    description: "Deployment #104 introduced a CPU loop, spiking energy usage from 120Wh per batch to 4520Wh per batch.",
    application: "data-pipeline",
    value: "4520 Wh",
    threshold: "200 Wh",
    timestamp: subtractDays(0),
    status: "Active",
  },
  {
    id: "alert-2",
    severity: "Warning",
    title: "High idle power consumption in search-indexer",
    description: "Elasticsearch node averages 85% memory but CPU is idle, wasting 120W static server power.",
    application: "search-indexer",
    value: "120 W",
    threshold: "50 W",
    timestamp: subtractDays(1),
    status: "Active",
  },
  {
    id: "alert-3",
    severity: "Info",
    title: "Kepler agent integration disconnected",
    description: "Infrastructure telemetry agent on k8s-node-3 offline. Falling back to estimation model.",
    application: "recommendation-engine",
    value: "Offline",
    threshold: "Online",
    timestamp: subtractDays(2),
    status: "Resolved",
  },
];

export const mockInsights: Insight[] = [
  {
    id: "insight-1",
    type: "Regression",
    title: "Energy usage increased by 210% on deploy #432",
    description: "Following release v2.4.1 of payment-gateway, average CPU cycles per API transaction rose from 1.2M to 3.8M due to an un-indexed encryption loop.",
    timestamp: subtractDays(1),
    application: "payment-gateway",
    severity: "High",
  },
  {
    id: "insight-2",
    type: "Optimization",
    title: "Carbon savings achieved by database upgrade",
    description: "Moving from PostgreSQL 13 to Postgres 15 on auth-service reduced disk I/O wait times, shrinking host system carbon footprint by 12.5% over the past 30 days.",
    timestamp: subtractDays(3),
    application: "auth-service",
    severity: "Medium",
  },
  {
    id: "insight-3",
    type: "Hotspot",
    title: "data-pipeline represents 74% of staging carbon footprint",
    description: "Analytical jobs are running on standard x86 servers without scheduling filters. Moving staging ETL workloads to AWS Graviton (ARM) processors would immediately reduce carbon emissions by 40%.",
    timestamp: subtractDays(5),
    application: "data-pipeline",
    severity: "High",
  },
];

// Helper to filter items based on workspace, environment, or search query
export const getFilteredApplications = (
  environment: string,
  searchQuery: string
) => {
  return mockApplications.filter((app) => {
    const matchesEnv = environment === "all" || app.environment === environment;
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.owner.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEnv && matchesSearch;
  });
};
