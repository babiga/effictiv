# Context

We are building an open-source project called **Effictiv**.

Effictiv is NOT a cloud cost optimization platform.

Effictiv is a **Software Energy Intelligence Platform** whose mission is to help developers build more energy-efficient, sustainable software and reduce the environmental impact of computing.

The dashboard should communicate sustainability, software efficiency, environmental impact, and engineering insights—not finance.

Think of the product as:

- Vercel
- Linear
- Datadog
- GitHub
- Green Software Foundation

combined into one modern dashboard.

The UI should feel minimal, premium, spacious, and data-focused.

Use:

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Recharts
- Framer Motion
- Lucide React

Use mock data only.

Do NOT implement backend.

---

# Dashboard Philosophy

Every page should answer one of these questions:

1. How energy-efficient is our software?
2. Where is software wasting energy?
3. What can engineers improve?
4. Has our software become more sustainable over time?
5. Which deployment or commit affected energy consumption?

Avoid making money the primary metric.

Cost may exist as optional metadata, but energy and sustainability should always be the primary focus.

---

# Replace Business Metrics

Remove emphasis on:

- Revenue
- Profit
- ROI
- Cloud Spending
- Financial KPIs

Instead prioritize:

- Energy (Wh / kWh)
- Carbon Emissions (gCO₂e / kgCO₂e)
- Efficiency Score
- Energy per Request
- Energy per API Call
- Energy per Build
- Energy per Deployment
- Sustainability Trend
- Carbon Reduction
- Green Score
- Energy Hotspots

---

# Dashboard Sections

## KPI Cards

Show:

- Total Energy Usage
- Carbon Emissions
- Green Score
- Energy Efficiency
- Active Applications
- Measurements Today
- Sustainability Improvements
- Active Alerts

---

## Main Charts

Create charts for:

Energy Usage Trend

Carbon Emissions Trend

Energy by Application

Energy by Infrastructure

Energy by Programming Language

Energy by Deployment

Green Score Trend

Resource Energy Distribution

---

## Hotspots

Table showing:

Application

Endpoint

Energy

Carbon

Trend

Severity

---

## Sustainability Insights

Instead of generic analytics, create AI insight cards such as:

"Image Processing Service consumes 27% more energy after the latest deployment."

"Idle Kubernetes nodes are responsible for unnecessary energy usage."

"API caching reduced energy consumption by 14%."

Each insight includes:

- explanation
- confidence
- affected services
- environmental impact

---

## AI Recommendations

Focus on sustainability recommendations.

Examples:

Enable image optimization.

Reduce unnecessary polling.

Move scheduled jobs to low-carbon periods.

Optimize database queries.

Reduce idle containers.

Enable autoscaling.

Replace inefficient algorithms.

Each recommendation includes:

Estimated Energy Reduction

Estimated Carbon Reduction

Difficulty

Priority

Expected Impact

---

## Benchmarks

Allow comparison between:

Commits

Deployments

Versions

Branches

Applications

Compare:

Energy

Carbon

Efficiency

CPU

Memory

Latency

Show improvements and regressions.

---

## Reports

Generate mock reports for:

Weekly Sustainability Report

Carbon Report

Engineering Report

Green Score Report

Project Sustainability Timeline

---

## Sidebar

Dashboard

Applications

Measurements

Analytics

Insights

Recommendations

Benchmarks

Reports

Alerts

Integrations

Team

Settings

---

# Design Language

Everything should communicate:

Energy

Sustainability

Efficiency

Engineering

Observability

Do NOT use obvious "eco" clichés everywhere.

Avoid excessive leaves, trees, or bright green gradients.

Use a professional SaaS aesthetic similar to Vercel or Linear.

Primary accent should be emerald/green used sparingly to indicate positive sustainability improvements.

Use neutral grays with excellent spacing.

---

# Empty States

Every page should have polished empty states.

Examples:

"No measurements collected yet."

"Connect Scaphandre to begin measuring server energy."

"Connect GitHub to analyze deployment impact."

---

# Mock Data

Create realistic TypeScript mock data for:

Applications

Measurements

Energy Profiles

Recommendations

Insights

Alerts

Reports

Benchmarks

Deployments

Repositories

---

# Component Requirements

Build reusable components for:

Energy KPI Card

Green Score Card

Carbon Card

Insight Card

Recommendation Card

Hotspot Table

Measurement Timeline

Deployment Timeline

Application Card

Energy Trend Chart

Carbon Trend Chart

Green Score Chart

Energy Breakdown Chart

---

# Final Goal

The final result should feel like a modern, production-ready open-source Green Software platform.

When someone opens the dashboard, they should immediately understand that Effictiv exists to help engineers build software that consumes less energy and reduces environmental impact—not simply to reduce cloud costs.

Prioritize excellent UX, reusable architecture, accessibility, responsive layouts, clean code organization, and beautiful visual hierarchy.
