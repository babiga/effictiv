import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "../benchmarks/dashboard/node_modules/playwright-core/index.mjs";

const fixture = JSON.parse(readFileSync(new URL("../benchmarks/dashboard/fixture.json", import.meta.url)));
const port = process.env.EFFICTIV_PROFILE_TEST_PORT ?? "3105";
const origin = `http://127.0.0.1:${port}`;
const slotSelector = '[data-slot="service-energy-profile"]';
let server;
let browser;
let logs = "";

before(async () => {
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port], {
    env: { ...process.env, TZ: "UTC", NEXT_TELEMETRY_DISABLED: "1" },
  });
  for (const stream of [server.stdout, server.stderr]) stream.on("data", (chunk) => { logs += chunk; });
  for (let attempt = 0; attempt < 80; attempt++) {
    if ((await fetch(`${origin}/dashboard`).catch(() => null))?.ok) break;
    assert.equal(server.exitCode, null, logs);
    await delay(125);
  }
  assert.equal((await fetch(`${origin}/dashboard`)).status, 200, logs);
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  if (server?.exitCode === null) {
    const closed = once(server, "close");
    server.kill();
    await closed;
  }
});

test("the profile reserves its height and mounts at first viewport intersection", async () => {
  const page = await browser.newPage({ viewport: fixture.viewport });
  try {
    await page.route("**/*", (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await page.goto(`${origin}/dashboard`);
    const slot = page.locator(slotSelector);
    const chart = slot.locator('svg[role="application"]');
    await page.getByText("Service Energy Profile", { exact: true }).waitFor();
    await page.locator("path.recharts-area-curve").first().waitFor();
    const before = await slot.boundingBox();
    assert.ok(before && before.y >= fixture.viewport.height);
    assert.equal(before.height, 220);
    assert.equal(await chart.count(), 0);

    await slot.scrollIntoViewIfNeeded();
    await chart.locator(".recharts-radar-polygon path").first().waitFor();
    await chart.focus();
    const tooltip = slot.locator(".recharts-tooltip-wrapper");
    for (const [service, value] of Object.entries(fixture.serviceProfile.expectedServices)) {
      await tooltip.locator("div").filter({ hasText: new RegExp(`^${service}:${value}$`) }).waitFor();
    }
    assert.equal((await slot.boundingBox()).height, before.height);

    await slot.evaluate((element) => {
      element.closest("main")?.scrollTo({ top: 0, behavior: "instant" });
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    assert.ok((await slot.boundingBox()).y >= fixture.viewport.height);
    assert.equal(await chart.count(), 1);
  } finally {
    await page.close();
  }
});

test("loads the profile without IntersectionObserver", async () => {
  const page = await browser.newPage({ viewport: fixture.viewport });
  try {
    await page.route("**/*", (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await page.addInitScript(() => { Reflect.deleteProperty(window, "IntersectionObserver"); });
    await page.goto(`${origin}/dashboard`);
    const slot = page.locator(slotSelector);
    await slot.locator(".recharts-radar-polygon path").first().waitFor();
    assert.ok((await slot.boundingBox()).y >= fixture.viewport.height);
  } finally {
    await page.close();
  }
});
