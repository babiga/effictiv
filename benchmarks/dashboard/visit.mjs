import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright-core";

const fixtureBytes = readFileSync(new URL("fixture.json", import.meta.url));
const fixture = JSON.parse(fixtureBytes);
const fixtureSha256 = createHash("sha256").update(fixtureBytes).digest("hex");
const mockDataSha256 = process.env.EFFICTIV_BENCHMARK_MOCK_DATA_SHA256 ?? createHash("sha256")
  .update(readFileSync(new URL("../../lib/mockData.ts", import.meta.url)))
  .digest("hex");
const origin = "http://127.0.0.1:3000";
const timeout = 10_000;
const summaryFile = process.env.EFFICTIV_BENCHMARK_SUMMARY_FILE;

async function waitForServer() {
  const deadline = performance.now() + 30_000;
  while (performance.now() < deadline) {
    const response = await fetch(`${origin}/`, {
      redirect: "manual",
      signal: AbortSignal.timeout(1000),
    }).catch(() => null);
    if (response?.status === 307 && response.headers.get("location") === "/dashboard") {
      return;
    }
    await delay(250);
  }
  throw new Error("Production server did not become ready");
}

function chartCard(page, title) {
  const heading = page.getByText(title, { exact: true });
  return page.locator('[data-slot="card"]').filter({ has: heading });
}

async function assertLanding(page) {
  const card = chartCard(page, "Energy & Carbon Trend");
  const chart = card.locator('svg[role="application"]');
  await card.locator("path.recharts-area-curve").first().waitFor();
  await chart.evaluate((svg) => svg.focus({ preventScroll: true }));

  const tooltip = card.locator(".recharts-tooltip-wrapper");
  await tooltip.getByText(fixture.trend.dateLabel, { exact: true }).waitFor();
  await tooltip.getByText("Energy (kWh):", { exact: true }).waitFor();
  const reading = tooltip.getByText(fixture.trend.energyLabel, { exact: true });
  await reading.waitFor();
  assert.equal(await page.evaluate(() => scrollY + document.querySelector("main").scrollTop), 0);
  const bounds = await reading.boundingBox();
  assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= fixture.viewport.height,
    "The energy trend reading should be in the initial viewport");
}

async function assertScrolledChart(page) {
  const card = chartCard(page, "Service Energy Profile");
  const scrollPosition = () => page.evaluate(() => scrollY + document.querySelector("main").scrollTop);
  const before = await scrollPosition();
  await card.scrollIntoViewIfNeeded();
  assert.ok(await scrollPosition() > before, "Expected scrolling to reveal the service profile chart");

  const chart = card.locator('svg[role="application"]');
  await chart.getByText(fixture.serviceProfile.firstAxis, { exact: true }).waitFor();
  await chart.locator(".recharts-radar-polygon path").first().waitFor();
  await chart.focus();

  const tooltip = card.locator(".recharts-tooltip-wrapper");
  for (const [service, value] of Object.entries(fixture.serviceProfile.expectedServices)) {
    await tooltip.locator("div").filter({ hasText: new RegExp(`^${service}:${value}$`) }).waitFor();
  }
}

async function visit(browser, path) {
  const { viewport, locale, timezoneId } = fixture;
  const context = await browser.newContext({
    viewport, locale, timezoneId, colorScheme: "dark", serviceWorkers: "block",
  });
  try {
    // Route only loopback requests. Playwright routing also disables the HTTP cache.
    await context.route("**/*", (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(timeout);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const finishedRequests = [];
    page.on("requestfinished", (request) => finishedRequests.push(request));

    const start = performance.now();
    const response = await page.goto(`${origin}/dashboard`, { waitUntil: "domcontentloaded" });
    assert.equal(response?.status(), 200);
    await assertLanding(page);
    const timeToUsableMs = Math.round(performance.now() - start);
    if (path === "scroll") await assertScrolledChart(page);
    const timeToAssertionMs = Math.round(performance.now() - start);
    assert.deepEqual(errors, [], "Dashboard raised an uncaught error");

    const sizes = await Promise.all(finishedRequests.map((request) => request.sizes()));
    const transferredBytes = sizes.reduce((sum, size) => sum + size.responseHeadersSize + size.responseBodySize, 0);
    assert.ok(transferredBytes > 0, "Expected transferred response bytes");
    return { timeToUsableMs, timeToAssertionMs, transferredBytes };
  } finally {
    await context.close();
  }
}

const [path, count] = process.argv.slice(2);
if (path === "wait") {
  await waitForServer();
} else {
  assert.ok(["landing", "scroll"].includes(path) && /^[1-9]\d{0,2}$/.test(count),
    "Usage: node visit.mjs wait | (landing|scroll) <visits 1–999>");
  const startedAt = new Date().toISOString();
  const visits = [];
  const browser = await chromium.launch({ headless: true });
  try {
    assert.equal(browser.version(), fixture.chromiumVersion);
    for (let index = 0; index < Number(count); index += 1) {
      try {
        visits.push({ assertion: "passed", ...await visit(browser, path) });
      } catch (error) {
        visits.push({ assertion: "failed", reason: summaryFile ? "A dashboard visit did not satisfy the benchmark assertions." : error.message });
      }
    }
  } finally {
    await browser.close();
  }
  const completedVisits = visits.filter((entry) => entry.assertion === "passed").length;
  const failedVisits = visits.length - completedVisits;
  const summary = JSON.stringify({
    scenario: `dashboard-${path}`,
    revision: fixture.revision,
    fixtureSha256,
    mockDataSha256,
    browserVersion: browser.version(),
    viewport: fixture.viewport,
    cachePolicy: "fresh-browser-context-per-visit",
    startedAt,
    finishedAt: new Date().toISOString(),
    assertion: failedVisits === 0 ? "passed" : "failed",
    completedVisits,
    failedVisits,
    visits,
  });
  if (summaryFile) writeFileSync(summaryFile, summary);
  else console.log("EFFICTIV_VISITS", summary);
  if (failedVisits) process.exitCode = 1;
}
