# Effictiv --- AI Agent Implementation Specification (v1)

## 1. Product Vision

**Effictiv** is a Software Energy Intelligence Platform that helps
engineering teams understand, optimize, and reduce the energy
consumption, cloud costs, and carbon footprint of their software.

Instead of only showing CPU, RAM, or power usage, Effictiv answers:

- Where is our energy going?
- Which deployment increased energy consumption?
- Which service wastes the most energy?
- How much money can we save?
- What should we optimize first?
- How sustainable is our software?

Target users: - Software Engineers - DevOps Engineers - SRE -
Engineering Managers - CTO - Sustainability/ESG teams

## 2. Design Philosophy

- Inspired by Vercel, Linear, Datadog, Stripe Dashboard, and Grafana.
- Clean, spacious, card-based UI.
- Dark mode first.
- Modern charts with minimal colors.
- Strong information hierarchy.

## 3. Sidebar

- Dashboard
- Applications
- Infrastructure
- Measurements
- Analytics
- Insights
- Recommendations
- Benchmarks
- Reports
- Alerts
- Integrations
- Team
- Settings

## 4. Dashboard

### Global Filters

- Workspace
- Date Range
- Environment
- Refresh
- Search

### KPI Cards

- Energy Usage
- Estimated Energy Cost
- Carbon Emissions
- Efficiency Score
- Potential Savings
- Active Applications
- Active Alerts

### Charts

- Energy Trend
- Top Energy Consumers
- Resource Distribution
- Efficiency Trend

### Intelligence

- Energy Hotspots
- AI Recommendations
- Recent Alerts

### Recent Measurements

- Run history table

## 5. Modules

### Applications

Overview, deployments, endpoints, recommendations, comparisons.

### Infrastructure

AWS, Azure, GCP, Kubernetes, Docker, Servers, VMs.

### Measurements

Energy, CPU, Memory, Carbon, Machine, Duration.

### Analytics

Energy, Carbon, Cost, Efficiency, Repositories, Services.

### Insights

AI-powered root cause analysis.

### Recommendations

Optimization suggestions with ROI and estimated savings.

### Benchmarks

Compare versions, commits, deployments, branches.

### Reports

Weekly, Monthly, Executive, Engineering, Carbon.

### Alerts

Energy, Carbon, Cost, CPU, Memory, Deployment regressions.

### Integrations

GitHub, GitLab, Docker, Kubernetes, Prometheus, Grafana, Scaphandre,
Kepler, CodeCarbon, CO2.js, OpenTelemetry, AWS, Azure, GCP, Vercel.

## 6. Components

### Layout

- Sidebar
- Header
- Breadcrumb
- Theme Toggle
- Command Palette

### Cards

- KPI Card
- Insight Card
- Recommendation Card
- Alert Card

### Charts

- Line
- Area
- Bar
- Donut

### Data

- Tables
- Pagination
- Skeletons
- Empty States

## 7. Mock Models

```ts
Application;
Measurement;
Recommendation;
Alert;
Insight;
```

## 8. Boilerplate Scope

- Responsive dashboard
- Mock data only
- Reusable components
- Production-ready architecture
