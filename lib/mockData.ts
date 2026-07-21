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
  carbonIntensity: number;
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
  estimatedSavingsCost: number;
  estimatedSavingskWh: number;
  estimatedSavingsCarbon: number;
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
  confidence: number;
  affectedServices: string[];
  environmentalImpact: {
    energySavedWh: number;
    carbonSavedGrams: number;
    treesEquivalent: number;
  };
}

export interface Deployment {
  id: string;
  version: string;
  commitSha: string;
  application: string;
  timestamp: string;
  energyBefore: number;
  energyAfter: number;
  carbonBefore: number;
  carbonAfter: number;
  efficiencyBefore: number;
  efficiencyAfter: number;
  cpuBefore: number;
  cpuAfter: number;
  memoryBefore: number;
  memoryAfter: number;
  status: "improved" | "regression" | "neutral";
  author: string;
}

export interface Benchmark {
  id: string;
  name: string;
  type: "commit" | "deployment" | "version" | "branch";
  application: string;
  timestamp: string;
  metrics: {
    energy: number;
    carbon: number;
    efficiency: number;
    cpu: number;
    memory: number;
    latency: number;
  };
  baselineMetrics?: {
    energy: number;
    carbon: number;
    efficiency: number;
    cpu: number;
    memory: number;
    latency: number;
  };
  verdict: "improved" | "regression" | "neutral";
}

export interface Hotspot {
  id: string;
  application: string;
  endpoint: string;
  energyWh: number;
  carbonGrams: number;
  trend: "improving" | "stable" | "regressing";
  severity: "critical" | "warning" | "info";
}

export interface GreenScore {
  id: string;
  date: string;
  score: number;
  energy: number;
  carbon: number;
  efficiency: number;
}

export interface Report {
  id: string;
  title: string;
  type: "weekly" | "carbon" | "engineering" | "green-score" | "timeline";
  date: string;
  summary: string;
  metrics: {
    energySaved?: number;
    carbonAvoided?: number;
    treesEquivalent?: number;
    efficiencyGain?: number;
    measurementsCount?: number;
  };
}

export interface SustainabilitySummary {
  period: string;
  narrative: string;
  energyChangePercent: number;
  energyAvoidedKwh: number;
  carbonPreventedKg: number;
  estimatedCostSavings: number;
  greenScoreCurrent: number;
  greenScorePrevious: number;
  optimizationsRemaining: number;
  impact: {
    treesEquivalent: number;
    drivingKmAvoided: number;
    homeElectricityMonths: number;
  };
}

const baseDate = new Date();
const subtractDays = (days: number) => {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

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
    carbonIntensity: 220,
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
  {
    id: "rec-5",
    category: "Code",
    title: "Replace inefficient image decoding algorithm",
    description: "image-processor uses a legacy JPEG decoder that consumes 3x more CPU cycles than modern alternatives. Switching to libvips or mozjpeg will reduce energy per thumbnail by 60%.",
    application: "image-processor",
    effort: "Medium",
    impact: "Medium",
    estimatedSavingsCost: 8.50,
    estimatedSavingskWh: 56,
    estimatedSavingsCarbon: 21280,
    status: "Active",
  },
  {
    id: "rec-6",
    category: "Infrastructure",
    title: "Reduce idle container replicas in notification-dispatcher",
    description: "notification-dispatcher maintains 8 replicas during off-peak hours (10 PM - 6 AM) but traffic drops to 2% capacity. Enabling HPA with minimum 2 replicas saves 75% of nighttime energy.",
    application: "notification-dispatcher",
    effort: "Low",
    impact: "Low",
    estimatedSavingsCost: 3.20,
    estimatedSavingskWh: 21,
    estimatedSavingsCarbon: 7980,
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
    confidence: 94,
    affectedServices: ["stripe-charge", "checkout-api"],
    environmentalImpact: {
      energySavedWh: 0,
      carbonSavedGrams: 0,
      treesEquivalent: 0,
    },
  },
  {
    id: "insight-2",
    type: "Optimization",
    title: "Carbon savings achieved by database upgrade",
    description: "Moving from PostgreSQL 13 to Postgres 15 on auth-service reduced disk I/O wait times, shrinking host system carbon footprint by 12.5% over the past 30 days.",
    timestamp: subtractDays(3),
    application: "auth-service",
    severity: "Medium",
    confidence: 88,
    affectedServices: ["token-sign", "validate-session"],
    environmentalImpact: {
      energySavedWh: 14500,
      carbonSavedGrams: 5510,
      treesEquivalent: 0.25,
    },
  },
  {
    id: "insight-3",
    type: "Hotspot",
    title: "data-pipeline represents 74% of staging carbon footprint",
    description: "Analytical jobs are running on standard x86 servers without scheduling filters. Moving staging ETL workloads to AWS Graviton (ARM) processors would immediately reduce carbon emissions by 40%.",
    timestamp: subtractDays(5),
    application: "data-pipeline",
    severity: "High",
    confidence: 91,
    affectedServices: ["etl-batch", "aggregate-db"],
    environmentalImpact: {
      energySavedWh: 75600,
      carbonSavedGrams: 28728,
      treesEquivalent: 1.31,
    },
  },
  {
    id: "insight-4",
    type: "Regression",
    title: "Memory leak in recommendation-engine increasing energy draw",
    description: "Over the past 7 days, RSS memory has grown from 1.2GB to 3.8GB without corresponding traffic increase. The garbage collector is running 4x more frequently, consuming extra CPU cycles.",
    timestamp: subtractDays(2),
    application: "recommendation-engine",
    severity: "High",
    confidence: 87,
    affectedServices: ["train-model", "inference-api"],
    environmentalImpact: {
      energySavedWh: 0,
      carbonSavedGrams: 0,
      treesEquivalent: 0,
    },
  },
  {
    id: "insight-5",
    type: "Optimization",
    title: "Image compression pipeline now 40% more energy efficient",
    description: "After migrating to WebP-native encoding, image-processor reduced per-thumbnail energy from 0.8Wh to 0.48Wh. At 50,000 thumbnails/day, this saves 16 kWh daily.",
    timestamp: subtractDays(4),
    application: "image-processor",
    severity: "Low",
    confidence: 96,
    affectedServices: ["thumbnail-gen", "image-crop"],
    environmentalImpact: {
      energySavedWh: 16000,
      carbonSavedGrams: 6080,
      treesEquivalent: 0.28,
    },
  },
  {
    id: "insight-6",
    type: "Hotspot",
    title: "search-indexer reindex job consumes 62% of cluster energy",
    description: "The nightly reindex-all job runs on oversized c5.4xlarge instances at 91% CPU for 2 hours. Profiling shows 35% of time spent on redundant field re-analysis that could be cached.",
    timestamp: subtractDays(1),
    application: "search-indexer",
    severity: "Medium",
    confidence: 82,
    affectedServices: ["reindex-all", "search-query"],
    environmentalImpact: {
      energySavedWh: 3115,
      carbonSavedGrams: 1184,
      treesEquivalent: 0.05,
    },
  },
];

export const mockDeployments: Deployment[] = [
  {
    id: "dep-1",
    version: "v2.4.1",
    commitSha: "a3f8c12",
    application: "payment-gateway",
    timestamp: subtractDays(1),
    energyBefore: 42,
    energyAfter: 78,
    carbonBefore: 15.96,
    carbonAfter: 29.64,
    efficiencyBefore: 88,
    efficiencyAfter: 72,
    cpuBefore: 18,
    cpuAfter: 34,
    memoryBefore: 480,
    memoryAfter: 512,
    status: "regression",
    author: "Sarah Chen",
  },
  {
    id: "dep-2",
    version: "v3.1.0",
    commitSha: "b7d2e45",
    application: "auth-service",
    timestamp: subtractDays(2),
    energyBefore: 14,
    energyAfter: 11,
    carbonBefore: 5.32,
    carbonAfter: 4.18,
    efficiencyBefore: 85,
    efficiencyAfter: 92,
    cpuBefore: 15,
    cpuAfter: 12,
    memoryBefore: 260,
    memoryAfter: 248,
    status: "improved",
    author: "Marcus Brody",
  },
  {
    id: "dep-3",
    version: "v1.8.3",
    commitSha: "c9a1f78",
    application: "data-pipeline",
    timestamp: subtractDays(3),
    energyBefore: 4400,
    energyAfter: 4520,
    carbonBefore: 1672,
    carbonAfter: 1717.6,
    efficiencyBefore: 64,
    efficiencyAfter: 62,
    cpuBefore: 80,
    cpuAfter: 82,
    memoryBefore: 3900,
    memoryAfter: 4096,
    status: "regression",
    author: "Emily Watson",
  },
  {
    id: "dep-4",
    version: "v2.0.0",
    commitSha: "d4e5b23",
    application: "image-processor",
    timestamp: subtractDays(4),
    energyBefore: 10,
    energyAfter: 8,
    carbonBefore: 3.8,
    carbonAfter: 1.76,
    efficiencyBefore: 90,
    efficiencyAfter: 95,
    cpuBefore: 7,
    cpuAfter: 5.6,
    memoryBefore: 140,
    memoryAfter: 128,
    status: "improved",
    author: "Khangal Hugo",
  },
  {
    id: "dep-5",
    version: "v4.2.0",
    commitSha: "e8f3a91",
    application: "search-indexer",
    timestamp: subtractDays(5),
    energyBefore: 8700,
    energyAfter: 8900,
    carbonBefore: 3296,
    carbonAfter: 3372,
    efficiencyBefore: 58,
    efficiencyAfter: 56,
    cpuBefore: 89,
    cpuAfter: 91,
    memoryBefore: 7800,
    memoryAfter: 8192,
    status: "regression",
    author: "Sarah Chen",
  },
  {
    id: "dep-6",
    version: "v1.5.0",
    commitSha: "f2c7d56",
    application: "notification-dispatcher",
    timestamp: subtractDays(6),
    energyBefore: 15,
    energyAfter: 14,
    carbonBefore: 5.7,
    carbonAfter: 5.32,
    efficiencyBefore: 82,
    efficiencyAfter: 84,
    cpuBefore: 5,
    cpuAfter: 4.2,
    memoryBefore: 200,
    memoryAfter: 192,
    status: "improved",
    author: "Marcus Brody",
  },
  {
    id: "dep-7",
    version: "v3.0.1",
    commitSha: "g1h4i78",
    application: "recommendation-engine",
    timestamp: subtractDays(7),
    energyBefore: 3100,
    energyAfter: 3200,
    carbonBefore: 1178,
    carbonAfter: 1216,
    efficiencyBefore: 68,
    efficiencyAfter: 65,
    cpuBefore: 62,
    cpuAfter: 65,
    memoryBefore: 1900,
    memoryAfter: 2048,
    status: "neutral",
    author: "Emily Watson",
  },
  {
    id: "dep-8",
    version: "v2.4.2",
    commitSha: "h5j8k09",
    application: "payment-gateway",
    timestamp: subtractDays(3),
    energyBefore: 78,
    energyAfter: 45,
    carbonBefore: 29.64,
    carbonAfter: 17.1,
    efficiencyBefore: 72,
    efficiencyAfter: 86,
    cpuBefore: 34,
    cpuAfter: 21,
    memoryBefore: 512,
    memoryAfter: 490,
    status: "improved",
    author: "Sarah Chen",
  },
  {
    id: "dep-9",
    version: "v3.1.1",
    commitSha: "i9l2m34",
    application: "auth-service",
    timestamp: subtractDays(1),
    energyBefore: 11,
    energyAfter: 12,
    carbonBefore: 4.18,
    carbonAfter: 4.56,
    efficiencyBefore: 92,
    efficiencyAfter: 90,
    cpuBefore: 12,
    cpuAfter: 12.4,
    memoryBefore: 248,
    memoryAfter: 256,
    status: "neutral",
    author: "Khangal Hugo",
  },
  {
    id: "dep-10",
    version: "v1.8.4",
    commitSha: "j3n6o78",
    application: "data-pipeline",
    timestamp: subtractDays(0),
    energyBefore: 4520,
    energyAfter: 2100,
    carbonBefore: 1717.6,
    carbonAfter: 798,
    efficiencyBefore: 62,
    efficiencyAfter: 78,
    cpuBefore: 82,
    cpuAfter: 74,
    memoryBefore: 4096,
    memoryAfter: 3800,
    status: "improved",
    author: "Emily Watson",
  },
];

export const mockBenchmarks: Benchmark[] = [
  {
    id: "bench-1",
    name: "PR #482: Refactor encryption module",
    type: "branch",
    application: "payment-gateway",
    timestamp: subtractDays(1),
    metrics: { energy: 78, carbon: 29.64, efficiency: 72, cpu: 34, memory: 512, latency: 145 },
    baselineMetrics: { energy: 42, carbon: 15.96, efficiency: 88, cpu: 18, memory: 480, latency: 120 },
    verdict: "regression",
  },
  {
    id: "bench-2",
    name: "Commit b7d2e45: Migrate to PostgreSQL 15",
    type: "commit",
    application: "auth-service",
    timestamp: subtractDays(2),
    metrics: { energy: 11, carbon: 4.18, efficiency: 92, cpu: 12, memory: 248, latency: 45 },
    baselineMetrics: { energy: 14, carbon: 5.32, efficiency: 85, cpu: 15, memory: 260, latency: 52 },
    verdict: "improved",
  },
  {
    id: "bench-3",
    name: "Deployment v1.8.3: ETL batch processing",
    type: "deployment",
    application: "data-pipeline",
    timestamp: subtractDays(3),
    metrics: { energy: 4520, carbon: 1717.6, efficiency: 62, cpu: 82, memory: 4096, latency: 3200 },
    baselineMetrics: { energy: 4400, carbon: 1672, efficiency: 64, cpu: 80, memory: 3900, latency: 3100 },
    verdict: "regression",
  },
  {
    id: "bench-4",
    name: "PR #491: WebP-native encoding",
    type: "branch",
    application: "image-processor",
    timestamp: subtractDays(4),
    metrics: { energy: 8, carbon: 1.76, efficiency: 95, cpu: 5.6, memory: 128, latency: 32 },
    baselineMetrics: { energy: 10, carbon: 3.8, efficiency: 90, cpu: 7, memory: 140, latency: 38 },
    verdict: "improved",
  },
  {
    id: "bench-5",
    name: "Version v4.2.0: Elasticsearch reindex",
    type: "version",
    application: "search-indexer",
    timestamp: subtractDays(5),
    metrics: { energy: 8900, carbon: 3372, efficiency: 56, cpu: 91, memory: 8192, latency: 7200 },
    baselineMetrics: { energy: 8700, carbon: 3296, efficiency: 58, cpu: 89, memory: 7800, latency: 7000 },
    verdict: "regression",
  },
  {
    id: "bench-6",
    name: "Commit d4e5b23: Thumbnail pipeline v2",
    type: "commit",
    application: "image-processor",
    timestamp: subtractDays(4),
    metrics: { energy: 8, carbon: 1.76, efficiency: 95, cpu: 5.6, memory: 128, latency: 32 },
    baselineMetrics: { energy: 10, carbon: 3.8, efficiency: 90, cpu: 7, memory: 140, latency: 38 },
    verdict: "improved",
  },
  {
    id: "bench-7",
    name: "PR #495: Optimize notification batching",
    type: "branch",
    application: "notification-dispatcher",
    timestamp: subtractDays(6),
    metrics: { energy: 14, carbon: 5.32, efficiency: 84, cpu: 4.2, memory: 192, latency: 28 },
    baselineMetrics: { energy: 15, carbon: 5.7, efficiency: 82, cpu: 5, memory: 200, latency: 30 },
    verdict: "improved",
  },
  {
    id: "bench-8",
    name: "Deployment v3.0.1: ML model update",
    type: "deployment",
    application: "recommendation-engine",
    timestamp: subtractDays(7),
    metrics: { energy: 3200, carbon: 1216, efficiency: 65, cpu: 65, memory: 2048, latency: 1800 },
    baselineMetrics: { energy: 3100, carbon: 1178, efficiency: 68, cpu: 62, memory: 1900, latency: 1750 },
    verdict: "neutral",
  },
];

export const mockHotspots: Hotspot[] = [
  {
    id: "hs-1",
    application: "search-indexer",
    endpoint: "/reindex-all",
    energyWh: 8900,
    carbonGrams: 3372,
    trend: "regressing",
    severity: "critical",
  },
  {
    id: "hs-2",
    application: "data-pipeline",
    endpoint: "/etl-batch",
    energyWh: 4520,
    carbonGrams: 1717.6,
    trend: "regressing",
    severity: "critical",
  },
  {
    id: "hs-3",
    application: "recommendation-engine",
    endpoint: "/train-model",
    energyWh: 3200,
    carbonGrams: 1216,
    trend: "stable",
    severity: "warning",
  },
  {
    id: "hs-4",
    application: "data-pipeline",
    endpoint: "/aggregate-db",
    energyWh: 2100,
    carbonGrams: 798,
    trend: "improving",
    severity: "warning",
  },
  {
    id: "hs-5",
    application: "payment-gateway",
    endpoint: "/stripe-charge",
    energyWh: 45,
    carbonGrams: 17.1,
    trend: "improving",
    severity: "info",
  },
  {
    id: "hs-6",
    application: "auth-service",
    endpoint: "/token-sign",
    energyWh: 12,
    carbonGrams: 4.56,
    trend: "stable",
    severity: "info",
  },
  {
    id: "hs-7",
    application: "image-processor",
    endpoint: "/thumbnail-gen",
    energyWh: 8,
    carbonGrams: 1.76,
    trend: "improving",
    severity: "info",
  },
  {
    id: "hs-8",
    application: "auth-service",
    endpoint: "/validate-session",
    energyWh: 3,
    carbonGrams: 1.14,
    trend: "stable",
    severity: "info",
  },
];

export const mockGreenScoreHistory: GreenScore[] = Array.from({ length: 30 }).map((_, i) => {
  const date = new Date(baseDate);
  date.setDate(date.getDate() - (29 - i));
  const baseScore = 62;
  const trend = i * 0.8;
  const noise = Math.sin(i * 0.7) * 4 + Math.cos(i * 0.3) * 2;
  return {
    id: `gs-${i}`,
    date: date.toISOString(),
    score: Math.min(95, Math.max(50, Math.round(baseScore + trend + noise))),
    energy: Math.round(5200 - i * 25 + Math.sin(i) * 200),
    carbon: Math.round(1976 - i * 10 + Math.sin(i) * 80),
    efficiency: Math.min(95, Math.max(60, Math.round(72 + i * 0.6 + noise * 0.5))),
  };
});

export const mockReports: Report[] = [
  {
    id: "rpt-1",
    title: "Weekly Sustainability Report",
    type: "weekly",
    date: subtractDays(0),
    summary: "This week your software saved 142 kWh of energy and avoided 53.96 kg of CO₂e emissions. That is equivalent to 2.45 trees absorbing carbon for an entire year.",
    metrics: {
      energySaved: 142,
      carbonAvoided: 53960,
      treesEquivalent: 2.45,
      efficiencyGain: 4.2,
      measurementsCount: 847,
    },
  },
  {
    id: "rpt-2",
    title: "Carbon Emissions Report",
    type: "carbon",
    date: subtractDays(1),
    summary: "Total carbon footprint across all services: 1.97 kg CO₂e. Grid intensity averaged 389 gCO₂e/kWh. Scheduling changes could reduce this by 31%.",
    metrics: {
      carbonAvoided: 31000,
      treesEquivalent: 1.41,
      measurementsCount: 234,
    },
  },
  {
    id: "rpt-3",
    title: "Engineering Efficiency Report",
    type: "engineering",
    date: subtractDays(2),
    summary: "Top contributors to energy efficiency this week: auth-service (upgraded DB, -12.5% energy), image-processor (WebP migration, -40% energy), notification-dispatcher (batching, -7% energy).",
    metrics: {
      efficiencyGain: 8.7,
      measurementsCount: 1203,
    },
  },
  {
    id: "rpt-4",
    title: "Green Score Progress Report",
    type: "green-score",
    date: subtractDays(3),
    summary: "Green Score improved from 62 to 78 over 30 days. Main drivers: auth-service PostgreSQL upgrade, image-processor WebP migration, and recommendation-engine scheduling optimization.",
    metrics: {
      efficiencyGain: 16,
      energySaved: 890,
      carbonAvoided: 338200,
      treesEquivalent: 15.37,
    },
  },
  {
    id: "rpt-5",
    title: "Project Sustainability Timeline",
    type: "timeline",
    date: subtractDays(0),
    summary: "Key milestones: Week 1 - Kepler agent deployed. Week 2 - First carbon alert triggered. Week 3 - 3 optimizations applied. Week 4 - Green Score crossed 75. Ongoing: 5 services monitored, 47 measurements daily.",
    metrics: {
      measurementsCount: 47,
      energySaved: 2100,
      carbonAvoided: 798000,
      treesEquivalent: 36.27,
    },
  },
];

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

export const mockSustainabilitySummary: SustainabilitySummary = {
  period: "this month",
  narrative: "Your software consumed 9% less energy than last month.",
  energyChangePercent: -9,
  energyAvoidedKwh: 1677,
  carbonPreventedKg: 652,
  estimatedCostSavings: 186,
  greenScoreCurrent: 88,
  greenScorePrevious: 82,
  optimizationsRemaining: 12,
  impact: {
    treesEquivalent: 94,
    drivingKmAvoided: 7800,
    homeElectricityMonths: 3,
  },
};

export const carbonPerKwh = 389;
export const drivingKmPerKgCo2 = 12;
export const homeElectricityKwhPerMonth = 900;
export const treesKgCo2PerYear = 21;
