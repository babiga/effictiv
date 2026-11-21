import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { Client } from "pg";
import { chromium } from "../benchmarks/dashboard/node_modules/playwright-core/index.mjs";
import { maxComparisonBytes } from "../lib/comparisons/schema.mjs";
import { pilotRepositoryId } from "../lib/measurements/pilot.mjs";
import { comparisonUpload } from "./comparison-fixtures.mjs";

const exec = promisify(execFile);
const databaseUrl = process.env.EFFICTIV_TEST_DATABASE_URL;
assert.ok(databaseUrl, "Set EFFICTIV_TEST_DATABASE_URL to a disposable PostgreSQL database");
const schema = `effictiv_comparisons_${randomBytes(6).toString("hex")}`;
const testUrl = new URL(databaseUrl);
testUrl.searchParams.set("options", `-c search_path=${schema}`);
const port = process.env.EFFICTIV_COMPARISON_TEST_PORT ?? "3103";
const base = `http://127.0.0.1:${port}`;
const api = `/api/v1/projects/${pilotRepositoryId}/comparisons`;
const token = randomBytes(32).toString("hex");
const env = {
  ...process.env, DATABASE_URL: testUrl.href, EFFICTIV_PILOT_WRITE_TOKEN: token,
  EFFICTIV_URL: base, NEXT_TELEMETRY_DISABLED: "1",
};
const db = new Client({ connectionString: testUrl.href });
let server;
let browser;
let logs = "";
let schemaCreated = false;

function get(path = api) {
  return fetch(`${base}${path}`);
}

function upload(body, credential = token) {
  return fetch(`${base}/api/v1/comparisons`, {
    method: "POST",
    headers: { Authorization: `Bearer ${credential}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function counts() {
  const { rows: [row] } = await db.query(`SELECT
    (SELECT count(*) FROM dashboard_comparisons)::int AS comparisons,
    (SELECT count(*) FROM dashboard_comparison_pairs)::int AS pairs,
    (SELECT count(*) FROM dashboard_comparison_artifacts)::int AS artifacts,
    (SELECT count(*) FROM runs)::int AS runs`);
  return row;
}

before(async () => {
  await db.connect();
  await db.query(`CREATE SCHEMA ${schema}`);
  schemaCreated = true;
  const migrated = await exec(process.execPath, ["scripts/migrate.mjs"], { env, timeout: 40_000 });
  assert.match(migrated.stdout, /004-comparisons/);
  const repeated = await exec(process.execPath, ["scripts/migrate.mjs"], { env, timeout: 40_000 });
  assert.match(repeated.stdout, /Database is up to date/);

  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port], { env });
  for (const stream of [server.stdout, server.stderr]) stream.on("data", (chunk) => { logs += chunk; });
  for (let index = 0; index < 80; index++) {
    if ((await get().catch(() => null))?.ok) break;
    assert.equal(server.exitCode, null, logs);
    await delay(125);
  }
  assert.equal((await get()).status, 200, logs);
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

test("Live Benchmarks and trusted publication", async (t) => {
  const fixture = comparisonUpload();
  const page = await browser.newPage();
  let comparison;
  let sourcePath;

  await t.test("live empty state, Demo and rejected uploads", async () => {
    await page.goto(`${base}/dashboard`);
    await page.getByRole("button", { name: "Benchmarks", exact: true }).click();
    await page.getByText("No comparisons yet", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Demo", exact: true }).click();
    await page.getByRole("button", { name: "commit", exact: true }).waitFor();
    await page.getByRole("button", { name: "Live", exact: true }).click();
    await page.getByText("No comparisons yet", { exact: true }).waitFor();
    assert.deepEqual(await (await get()).json(), { comparisons: [], nextCursor: null });
    assert.equal((await upload(fixture, "wrong-token")).status, 401);
    assert.equal((await upload({ ...fixture, repositoryId: "2" })).status, 422);
    assert.equal((await upload(" ".repeat(maxComparisonBytes))).status, 413);
    assert.deepEqual(await counts(), { comparisons: 0, pairs: 0, artifacts: 0, runs: 0 });
  });

  await t.test("concurrent replay is idempotent and conflicting replay is rejected", async () => {
    const responses = await Promise.all([upload(fixture), upload(fixture)]);
    assert.deepEqual(responses.map(({ status }) => status).sort(), [200, 201]);
    const [first, second] = await Promise.all(responses.map((response) => response.json()));
    assert.deepEqual(first, second);
    assert.deepEqual(first.comparisons.map(({ verdict }) => verdict), ["improved", "regressed"]);
    assert.equal((await upload({ ...fixture, pullRequest: fixture.pullRequest + 1 })).status, 409);
    assert.deepEqual(await counts(), { comparisons: 2, pairs: 24, artifacts: 48, runs: 48 });

    const firstPage = await (await get(`${api}?limit=1`)).json();
    const secondPage = await (await get(`${api}?limit=1&cursor=${firstPage.nextCursor}`)).json();
    assert.equal(firstPage.comparisons.length, 1);
    assert.equal(secondPage.comparisons.length, 1);
    assert.notEqual(firstPage.comparisons[0].id, secondPage.comparisons[0].id);
    assert.equal(secondPage.nextCursor, null);
    [comparison] = first.comparisons;
  });

  await t.test("details, source logs and browser deep link trace both sides", async () => {
    const detail = await (await get(`${api}/${comparison.id}`)).json();
    assert.equal(detail.pairs.length, 12, JSON.stringify(detail));
    assert.equal(detail.pairs[0].kind, "comparison");
    assert.equal(detail.pairs[0].baseline.energyWhPerVisit, 100);
    assert.equal(detail.pairs[0].candidate.energyWhPerVisit, 90);
    sourcePath = detail.pairs[0].baseline.sourceUrl;
    const source = await get(sourcePath);
    assert.equal(source.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.equal(await source.text(), fixture.scenarios[0].comparison[0].baseline.log);
    await page.reload();
    await page.getByRole("button", { name: "Benchmarks", exact: true }).click();
    await page.getByRole("link", { name: "View evidence" }).filter({ visible: true }).first().waitFor();
    await page.locator(`a[href="/dashboard/comparisons/${comparison.id}"]`).click();
    await page.getByRole("heading", { name: "Dashboard benchmark comparison" }).waitFor();
    await page.getByText("Improved", { exact: true }).waitFor();
    assert.equal(await page.getByRole("link", { name: "Comparison 1 baseline source log" }).getAttribute("href"), sourcePath);
    assert.ok(await page.getByRole("link", { name: "Comparison 1 candidate source log" }).isVisible());
    await page.reload();
    await page.getByRole("heading", { name: "Dashboard benchmark comparison" }).waitFor();
  });

  await t.test("publisher validates provenance and produces a replay-safe GitHub summary", async () => {
    const temporary = await mkdtemp(join(tmpdir(), "effictiv-publication-"));
    try {
      const file = join(temporary, "effictiv-comparison.json");
      await writeFile(file, JSON.stringify(fixture));
      const args = ["scripts/publish-comparison.mjs", file, fixture.workflowRunId, String(fixture.attempt),
        String(fixture.pullRequest), fixture.baselineSha, fixture.candidateSha];
      const { stdout } = await exec(process.execPath, args, { env, timeout: 40_000 });
      assert.match(stdout, /Advisory dashboard energy comparison/);
      assert.ok(stdout.includes(`/dashboard/comparisons/${comparison.id}`));
      assert.ok(stdout.includes(sourcePath));
      args[2] = "98765";
      await assert.rejects(exec(process.execPath, args, { env, timeout: 40_000 }), /trusted GitHub workflow metadata/);
      assert.deepEqual(await counts(), { comparisons: 2, pairs: 24, artifacts: 48, runs: 48 });
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });

  await t.test("project scopes and transaction rollback", async () => {
    await db.query("INSERT INTO projects (repository_id, repository_name, is_public) VALUES (2, 'example/other', true)");
    const other = api.replace(pilotRepositoryId, "2");
    assert.deepEqual(await (await get(other)).json(), { comparisons: [], nextCursor: null });
    assert.equal((await get(`${other}/${comparison.id}`)).status, 404);
    assert.equal((await get(sourcePath.replace(pilotRepositoryId, "2"))).status, 404);
    await db.query("UPDATE projects SET is_public = false WHERE repository_id = $1", [pilotRepositoryId]);
    try {
      assert.equal((await get(api)).status, 404);
      assert.equal((await get(`${api}/${comparison.id}`)).status, 404);
      assert.equal((await get(sourcePath)).status, 404);
    } finally {
      await db.query("UPDATE projects SET is_public = true WHERE repository_id = $1", [pilotRepositoryId]);
    }

    const retryable = comparisonUpload("12346");
    await db.query(`CREATE FUNCTION fail_scroll_pair() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF EXISTS (SELECT 1 FROM dashboard_comparisons WHERE id = NEW.comparison_id AND scenario_key = 'dashboard-scroll')
        THEN RAISE EXCEPTION 'simulated second-scenario failure'; END IF;
        RETURN NEW;
      END
    $$`);
    await db.query("CREATE TRIGGER fail_scroll_pair BEFORE INSERT ON dashboard_comparison_pairs FOR EACH ROW EXECUTE FUNCTION fail_scroll_pair()");
    try {
      assert.equal((await upload(retryable)).status, 503);
      assert.deepEqual(await counts(), { comparisons: 2, pairs: 24, artifacts: 48, runs: 48 });
    } finally {
      await db.query("DROP TRIGGER fail_scroll_pair ON dashboard_comparison_pairs");
    }
    retryable.scenarios[1].comparison[0].candidate = null;
    const response = await upload(retryable);
    assert.equal(response.status, 201, await response.clone().text());
    assert.equal((await response.json()).comparisons[1].verdict, "ineligible");
  });

  await page.close();
});
