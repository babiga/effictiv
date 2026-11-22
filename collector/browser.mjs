import { chromium } from "playwright-core";
import { category } from "./inventory.mjs";

export async function visit(s, audit) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ["--remote-debugging-port=0"],
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      serviceWorkers: "block",
    });
    const session = await page.context().newCDPSession(page),
      requests = new Map(),
      assets = [];
    await session.send("Network.enable");
    await session.send("Network.setCacheDisabled", { cacheDisabled: true });
    session.on("Network.responseReceived", ({ requestId, response, type }) => {
      if (!/^https?:/.test(response.url)) return;
      const u = new URL(response.url);
      const path = (u.origin === new URL(s.url).origin ? u.pathname : u.host + u.pathname).slice(0, 1024);
      const kind =
        { Image: "images", Script: "scripts", Stylesheet: "styles", Font: "fonts", Media: "media" }[type] ??
        category(path);
      requests.set(requestId, { path, category: kind });
    });
    session.on("Network.loadingFinished", ({ requestId, encodedDataLength }) => {
      const item = requests.get(requestId);
      if (item) assets.push({ ...item, bytes: encodedDataLength });
    });
    await page.addInitScript(() => {
      new PerformanceObserver((list) => {
        window.__effictivLcp = list.getEntries().at(-1)?.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    const start = performance.now();
    const res = await page.goto(s.url, { waitUntil: "load" });
    if (!res?.ok()) throw new Error("Page navigation failed.");
    await page
      .locator(s.selector)
      .filter({ hasText: s.expectedText })
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    const elapsedMs = performance.now() - start;
    const groups = new Map();
    for (const a of assets) {
      const g = groups.get(a.category) ?? { category: a.category, bytes: 0, files: 0 };
      g.bytes += a.bytes;
      g.files++;
      groups.set(a.category, g);
    }
    const lcpMs = await page.evaluate(() => window.__effictivLcp ?? null);
    const delivery = {
      requests: assets.length,
      lcpMs,
      groups: [...groups.values()],
      resources: assets.sort((a, b) => b.bytes - a.bytes).slice(0, 8),
      hints: [],
    };
    if (audit) {
      const images = await page.locator("img").evaluateAll((nodes) =>
        nodes.map((img) => ({
          path: new URL(img.currentSrc || img.src, document.baseURI).pathname.slice(0, 1024),
          source: img.naturalWidth,
          displayed: Math.ceil(img.getBoundingClientRect().width),
        })),
      );
      for (const img of images.filter((i) => i.displayed > 0 && i.source > i.displayed * 1.5).slice(0, 8)) {
        delivery.hints.push({
          path: img.path,
          detail: `Served width ${img.source}px for a ${img.displayed}px slot. Supply a responsive source.`,
          potentialBytes: 0,
        });
      }
      // Lighthouse runs a separate navigation after the measured visit.
      const { default: lighthouse } = await import("lighthouse");
      const cdp = await browser.newBrowserCDPSession();
      const { arguments: args } = await cdp.send("Browser.getBrowserCommandLine");
      const dir = args.find((a) => a.startsWith("--user-data-dir=")).slice("--user-data-dir=".length);
      const { readFile } = await import("node:fs/promises");
      const port = Number((await readFile(dir + "/DevToolsActivePort", "utf8")).split("\n")[0]);
      const result = await lighthouse(s.url, {
        port,
        output: "json",
        logLevel: "error",
        onlyAudits: ["image-delivery-insight"],
      });
      const items = result?.lhr.audits["image-delivery-insight"]?.details?.items ?? [];
      for (const item of items) {
        if (!item.url || !item.wastedBytes) continue;
        delivery.hints.unshift({
          path: new URL(item.url, s.url).pathname.slice(0, 1024),
          detail: "Lighthouse estimates fewer transferred bytes with a resized or re-encoded image.",
          potentialBytes: Math.round(item.wastedBytes),
        });
      }
      delivery.hints = delivery.hints.slice(0, 8);
    }
    return {
      sample: {
        elapsedMs,
        completed: 1,
        failed: 0,
        transferBytes: assets.reduce((sum, a) => sum + a.bytes, 0),
      },
      delivery,
    };
  } finally {
    await browser.close();
  }
}
