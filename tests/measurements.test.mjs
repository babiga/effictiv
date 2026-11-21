import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "pg";
import { chromium } from "../benchmarks/dashboard/node_modules/playwright-core/index.mjs";
import { pilotRepositoryId } from "../lib/measurements/pilot.mjs";

const databaseUrl = process.env.EFFICTIV_TEST_DATABASE_URL;
assert.ok(databaseUrl, "Set EFFICTIV_TEST_DATABASE_URL to a disposable PostgreSQL database");
const schema = `effictiv_test_${randomBytes(6).toString("hex")}`;
const testUrl = new URL(databaseUrl);
testUrl.searchParams.set("options", `-c search_path=${schema}`);
const port = process.env.EFFICTIV_TEST_PORT ?? "3102";
const baseUrl = `http://127.0.0.1:${port}`;
const token = randomBytes(32).toString("hex");
const env = {
  ...process.env, DATABASE_URL: testUrl.href, EFFICTIV_PILOT_WRITE_TOKEN: token, EFFICTIV_URL: baseUrl,
  NEXT_TELEMETRY_DISABLED: "1",
};
const db = new Client({ connectionString: testUrl.href });
const rawFixtureUrl = "https://raw.githubusercontent.com/babiga/effictiv/909945540735b7f5c6a7594e55b9b3112e4bbf47/benchmarks/dashboard/fixtures/smoke-v1";
const fixtureDirectory = "benchmarks/dashboard/fixtures/smoke-v1";
let server;
let browser;
let schemaCreated = false;
let logs = "";

function script(file, args = []) {
  return spawnSync(process.execPath, [file, ...args], { env, encoding: "utf8", timeout: 40_000 });
}

async function fixture(path) {
  return {
    repositoryId: pilotRepositoryId, attempt: 1, repetition: 1, artifactUrl: `${rawFixtureUrl}/${path}.log`,
    result: JSON.parse(await readFile(`${fixtureDirectory}/${path}.json`, "utf8")),
  };
}

function runs(query = "", repository = pilotRepositoryId) {
  return fetch(`${baseUrl}/api/v1/projects/${repository}/runs${query}`);
}

function upload(payload, credential = token) {
  return fetch(`${baseUrl}/api/v1/runs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${credential}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function counts() {
  const { rows } = await db.query(`SELECT
    (SELECT count(*) FROM scenarios) AS scenarios,
    (SELECT count(*) FROM runs) AS runs,
    (SELECT count(*) FROM observations) AS observations`);
  return rows[0];
}

async function openMeasurements(page) {
  await page.goto(`${baseUrl}/dashboard`);
  await page.getByRole("button", { name: "Measurements", exact: true }).click();
}

async function syntheticEnergy(readings) {
  const payload = await fixture("scroll");
  payload.artifactUrl = "https://example.test/fixtures/synthetic-rapl.log";
  Object.assign(payload.result, {
    collector: { name: "Green Metrics Tool", version: "4.2", commit: "7f11a4309dd1d26f5bb8e97e561ef3a65c1a61d2" },
    sourceRunId: randomUUID(),
    hardware: { ...payload.result.hardware, raplMsrDevicePresent: true },
    energy: {
      status: "available", metric: "cpu_energy_rapl_msr_component", phase: "Dashboard visits", phaseDurationUs: 2_000_000,
      coverage: "Host CPU packages, including Chromium and Next.js CPU activity", readings,
    },
  });
  return payload;
}

before(async () => {
  await db.connect();
  await db.query(`CREATE SCHEMA ${schema}`);
  schemaCreated = true;
  const migrated = script("scripts/migrate.mjs");
  assert.equal(migrated.status, 0, migrated.stderr);
  const repeated = script("scripts/migrate.mjs");
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.match(repeated.stdout, /Database is up to date/);

  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port], { env });
  for (const stream of [server.stdout, server.stderr]) stream.on("data", (chunk) => { logs += chunk; });
  for (let attempt = 0; attempt < 80; attempt++) {
    if ((await runs().catch(() => null))?.ok) break;
    assert.equal(server.exitCode, null, logs);
    await delay(125);
  }
  assert.equal((await runs()).status, 200, logs);
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  if (server?.exitCode === null) {
    const closed = once(server, "close");
    server.kill();
    await closed;
  }
  if (schemaCreated) await db.query(`DROP SCHEMA ${schema} CASCADE`);
  await db.end();
});

test("live Measurements, trusted upload, and export", async (t) => {
  const smoke = await fixture("landing");
  const page = await browser.newPage({ acceptDownloads: true });
  const table = page.getByRole("table", { name: "Measurement runs" });

  await t.test("fresh live project and rejected uploads", async () => {
    await openMeasurements(page);
    await page.getByText("No measurements collected yet.", { exact: true }).waitFor();
    assert.deepEqual(await (await runs()).json(), { runs: [], nextCursor: null });
    const badUnit = await syntheticEnergy([{ domain: "Package_0", value: 1, unit: "kWh" }]);
    assert.equal((await upload(badUnit)).status, 422);
    assert.equal((await upload(smoke, "incorrect-token")).status, 401);
    assert.equal((await upload({ ...smoke, repositoryId: "2" })).status, 422);
    assert.deepEqual(await counts(), { scenarios: "0", runs: "0", observations: "0" });
  });

  let importedId;
  await t.test("concurrent and sequential replays return one persisted ID", async () => {
    const reordered = Object.fromEntries(Object.entries(smoke).reverse());
    const responses = await Promise.all([upload(smoke), upload(reordered), upload(smoke)]);
    assert.deepEqual(responses.map(({ status }) => status).sort(), [200, 200, 201]);
    const ids = await Promise.all(responses.map(async (response) => (await response.json()).id));
    importedId = ids[0];
    assert.equal(new Set(ids).size, 1);

    const replay = script("scripts/import-run.mjs", [`${fixtureDirectory}/landing.json`, smoke.artifactUrl]);
    assert.equal(replay.status, 0, replay.stderr);
    assert.match(replay.stdout, new RegExp(`Already imported ${importedId}`));
    const changed = structuredClone(smoke);
    changed.result.workload.revision++;
    assert.equal((await upload(changed)).status, 409);
    assert.deepEqual(await counts(), { scenarios: "1", runs: "1", observations: "9" });

    const directory = await mkdtemp(join(tmpdir(), "effictiv-log-check-"));
    try {
      const filename = join(directory, "landing.json");
      await writeFile(filename, JSON.stringify(smoke.result));
      await writeFile(join(directory, "landing.log"), "changed log");
      const rejected = script("scripts/import-run.mjs", [filename, smoke.artifactUrl]);
      assert.equal(rejected.status, 1);
      assert.match(rejected.stderr, /does not match the result digest/);
    } finally {
      await rm(directory, { recursive: true });
    }
  });

  await t.test("one UI row and one CSV row after reload, with Demo and retry available", async () => {
    await openMeasurements(page);
    await table.waitFor();
    assert.equal(await table.getByRole("row").count(), 2);
    await table.getByText("Unavailable", { exact: true }).waitFor();
    assert.equal(await table.getByRole("link", { name: "Collector log" }).getAttribute("href"), smoke.artifactUrl);
    const [download] = await Promise.all([
      page.waitForEvent("download"), page.getByRole("link", { name: "Export CSV" }).click(),
    ]);
    const csv = (await readFile(await download.path(), "utf8")).trimEnd().split("\r\n");
    assert.equal(csv.length, 2);
    assert.ok(csv[1].startsWith(`"${importedId}"`));

    await page.getByRole("button", { name: "Demo", exact: true }).click();
    await page.getByText("Granular Measurements Log", { exact: true }).waitFor();
    await db.query("ALTER TABLE observations RENAME TO held_observations");
    try {
      await page.getByRole("button", { name: "Live", exact: true }).click();
      await page.getByText("Measurements are temporarily unavailable.", { exact: true }).waitFor();
      assert.equal((await runs()).status, 503);
    } finally {
      await db.query("ALTER TABLE held_observations RENAME TO observations");
    }
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await table.waitFor();
    assert.equal(await table.getByRole("row").count(), 2);
  });

  await t.test("observations preserve units, measured zero, and failed-task status", async () => {
    const measured = await syntheticEnergy([
      { domain: "Package_0", value: 3_600_000_000, unit: "uJ" },
      { domain: "Package_1", value: 3600, unit: "J" },
      { domain: "Package_2", value: 1, unit: "Wh" },
    ]);
    const zero = await syntheticEnergy([{ domain: "Package_0", value: 0, unit: "uJ" }]);
    const failed = await syntheticEnergy([{ domain: "Package_0", value: 3600, unit: "J" }]);
    failed.result.assertion = failed.result.workload.assertion = "failed";
    failed.result.workload.failedVisits = 1;
    failed.result.workload.completedVisits = 2;
    failed.result.workload.visits[0] = { assertion: "failed", reason: "Synthetic assertion failure" };
    for (const payload of [measured, zero, failed, await fixture("scroll")]) {
      const response = await upload(payload);
      assert.equal(response.status, 201, await response.text());
    }
    const { runs: all } = await (await runs()).json();
    const find = ({ result }) => all.find((run) => run.sourceRunId === result.sourceRunId);
    assert.equal(find(measured).energyWh, 3);
    assert.equal(find(measured).energyWhPerVisit, 1);
    assert.deepEqual(find(measured).energyReadings, measured.result.energy.readings);
    assert.equal(find(zero).energyWh, 0);
    assert.equal(find(zero).energyWhPerVisit, 0);
    assert.equal(find(failed).energyWh, 1);
    assert.equal(find(failed).energyWhPerVisit, null);
    assert.equal(find(failed).failedVisits, 1);
  });

  await t.test("read filters, cursor pagination and CSV share the same run set", async () => {
    const filter = "?scenario=dashboard-scroll&search=Green";
    const { runs: expected } = await (await runs(filter)).json();
    assert.equal(expected.length, 3);
    const visited = [];
    let cursor;
    do {
      const next = await (await runs(`${filter}&limit=1${cursor ? `&cursor=${cursor}` : ""}`)).json();
      visited.push(...next.runs.map(({ id }) => id));
      cursor = next.nextCursor;
    } while (cursor);
    assert.deepEqual(visited, expected.map(({ id }) => id));
    const csv = (await (await runs(`${filter}&format=csv`)).text()).trimEnd().split("\r\n");
    assert.deepEqual(csv.slice(1).map((row) => row.split(",")[0]), visited.map((id) => `"${id}"`));

    await page.getByRole("textbox", { name: "Search measurements" }).fill("Green");
    await page.getByRole("combobox", { name: "Filter by scenario" }).click();
    await page.getByRole("option", { name: "Dashboard scroll", exact: true }).click();
    const exportLink = page.getByRole("link", { name: "Export CSV" });
    await exportLink.waitFor();
    assert.equal(await table.getByRole("row").count(), 4);
    assert.equal(await exportLink.getAttribute("href"),
      `/api/v1/projects/${pilotRepositoryId}/runs?scenario=dashboard-scroll&search=Green&format=csv`);
    await table.getByText("0 Wh", { exact: true }).waitFor();
    const measuredRow = table.getByRole("row").filter({ has: page.getByText("3 Wh", { exact: true }) });
    await measuredRow.getByText("Original readings", { exact: true }).click();
    await measuredRow.getByText("Package_1 · 3600 J", { exact: true }).waitFor();

    await db.query("INSERT INTO projects VALUES (2, 'other/public', true), (3, 'other/private', false)");
    assert.deepEqual(await (await runs("", "2")).json(), { runs: [], nextCursor: null });
    assert.equal((await runs("", "3")).status, 404);
  });

  await t.test("a failed observation insert rolls back the run and can be retried", async () => {
    const payload = structuredClone(smoke);
    payload.attempt = 2;
    payload.result.workload.revision++;
    const previous = await counts();
    await db.query(`
      CREATE FUNCTION reject_observation() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'test observation insert failure'; END; $$;
      CREATE TRIGGER reject_observation BEFORE INSERT ON observations
        FOR EACH ROW EXECUTE FUNCTION reject_observation();
    `);
    try {
      const response = await upload(payload);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("Retry-After"), "5");
      assert.deepEqual(await counts(), previous);
    } finally {
      await db.query("DROP TRIGGER reject_observation ON observations; DROP FUNCTION reject_observation()");
    }
    assert.equal((await upload(payload)).status, 201);
  });

  await page.close();
});
