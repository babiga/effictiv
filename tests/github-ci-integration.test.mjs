import { workloadReport } from "./workload-fixtures.mjs";
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { createHash, createHmac, generateKeyPairSync, randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { Client } from "pg";
import { chromium } from "../benchmarks/dashboard/node_modules/playwright-core/index.mjs";
import { ecoCiArtifactSchema, summarizeEcoCiArtifact } from "../lib/measurements/eco-ci-schema.mjs";

const exec = promisify(execFile);
const databaseUrl = process.env.EFFICTIV_TEST_DATABASE_URL;
assert.ok(databaseUrl, "Set EFFICTIV_TEST_DATABASE_URL to a disposable PostgreSQL database");
const schema = `effictiv_github_${randomBytes(6).toString("hex")}`;
const testUrl = new URL(databaseUrl);
testUrl.searchParams.set("options", `-c search_path=${schema}`);
const db = new Client({ connectionString: testUrl.href });
const port = process.env.EFFICTIV_GITHUB_TEST_PORT ?? "3106";
const base = `http://127.0.0.1:${port}`;
const webhookSecret = randomBytes(32).toString("hex");
const cronSecret = randomBytes(32).toString("hex");
const digest = (body) => createHash("sha256").update(body).digest("hex");
const publicRepo = { id: 601, full_name: "test-org/public-build", private: false, default_branch: "main" };
const privateRepo = { id: 602, full_name: "test-org/private-build", private: true, default_branch: "main" };
const state = { repositories: [publicRepo, privateRepo], revoked: [], unavailable: [], runs: {} };
const sample = await readFile("benchmarks/eco-ci/fixtures/github-actions-44943649169.json", "utf8");
let directory;
let stateFile;
let server;
let logs = "";
let browser;
let schemaCreated = false;

async function capture(repository, id, kind = "success") {
  const artifact = JSON.parse(sample);
  const claimedRepository = kind === "wrong-repository" ? privateRepo : repository;
  Object.assign(artifact, { repository: claimedRepository.full_name, repositoryId: String(claimedRepository.id), runId: String(id), attempt: 1 });
  const laps = JSON.parse(artifact.lapData);
  Object.assign(laps, { repository: encodeURIComponent(claimedRepository.full_name), run_id: String(id) });
  artifact.lapData = JSON.stringify(laps);
  if (kind === "unsupported") {
    artifact.runner.logicalCpus = 2;
    artifact.startedAt = artifact.lapData = artifact.totalSamplesJoules = null;
    artifact.collectorOutcomes = { initialize: "skipped", install: "skipped", build: "skipped" };
  }
  if (kind === "failure") artifact.outcomes.build = "failure";

  const path = join(directory, String(id));
  await mkdir(path);
  const prefix = kind === "workload" ? "effictiv-workloads" : "effictiv-eco-ci";
  const capturePath = join(path, prefix + ".json");
  const archivePath = join(path, "artifact.zip");
  const report = {...workloadReport(), runId:String(id), repositoryId:String(repository.id)};
  const raw = JSON.stringify(kind === "workload" ? report : artifact);
  await writeFile(capturePath, raw);
  await exec("zip", ["-q", "-j", archivePath, capturePath]);
  const archive = await readFile(archivePath);

  const run = {
    id, run_attempt: 1, event: "workflow_dispatch", path: kind === "workload" ? ".github/workflows/effictiv-workloads.yml" : ".github/workflows/effictiv-energy.yml", status: "completed",
    conclusion: kind === "failure" ? "failure" : "success", head_sha: kind === "workload" ? report.commitSha : artifact.commitSha,
    head_branch: repository.default_branch, head_repository: { id: repository.id },
  };
  const source = {
    id: id + 1000, name: `${prefix}-${id}-1`, expired: false, size_in_bytes: archive.length,
    digest: `sha256:${digest(archive)}`,
    workflow_run: { id, repository_id: repository.id, head_repository_id: repository.id, head_sha: kind === "workload" ? report.commitSha : artifact.commitSha },
  };
  state.runs[id] = { run, source, archivePath, repositoryId: repository.id, manual: kind === "manual" };
  return raw;
}

async function until(fn) {
  for (let count = 0; count < 120; count++) {
    const result = await fn();
    if (result) return result;
    assert.equal(server.exitCode, null, logs);
    await delay(125);
  }
  assert.fail(`Timed out waiting for Effictiv\n${logs}`);
}

const request = (path, options) => fetch(`${base}${path}`, { redirect: "manual", ...options });
const urlFor = (repo) => `/dashboard/projects/${repo.id}`;
const apiFor = (repo) => `/api/v1/projects/${repo.id}`;
const sessionCookie = (response, name) => response.headers.getSetCookie().find((entry) => entry.startsWith(`${name}=`))?.split(";")[0];
const saveState = () => writeFile(stateFile, JSON.stringify(state));

async function authorize(login, corruptState = false) {
  const start = await request("/api/auth/github");
  assert.equal(start.status, 307);
  const provider = new URL(start.headers.get("location"));
  assert.equal(provider.origin, "https://github.com");
  assert.equal(provider.searchParams.get("code_challenge_method"), "S256");
  const cookie = sessionCookie(start, "effictiv_github_oauth");
  assert.ok(cookie);
  const state = corruptState ? "A".repeat(43) : provider.searchParams.get("state");
  const callback = await request(`/api/auth/github/callback?code=${login}&state=${state}`, { headers: { cookie } });
  assert.equal(callback.status, 303);
  if (corruptState) {
    assert.equal(new URL(callback.headers.get("location")).pathname, "/login");
    assert.equal(sessionCookie(callback, "effictiv_session"), undefined);
    return;
  }
  assert.equal(new URL(callback.headers.get("location")).pathname, "/dashboard");
  assert.match(callback.headers.getSetCookie().find((entry) => entry.startsWith("effictiv_session=")), /HttpOnly; SameSite=lax/i);
  return sessionCookie(callback, "effictiv_session");
}

function importRepo(repository, cookie, origin = base) {
  return request("/api/v1/projects", { method: "POST", headers: { cookie, origin },
    body: new URLSearchParams({ installationId: "702", repositoryId: String(repository.id) }) });
}

function signedWebhook(event, payload, valid = true) {
  const body = JSON.stringify(payload);
  const signature = valid ? createHmac("sha256", webhookSecret).update(body).digest("hex") : "0".repeat(64);
  return request("/api/github/webhook", {
    method: "POST",
    headers: { "x-github-event": event, "x-hub-signature-256": `sha256=${signature}`, "content-type": "application/json" },
    body,
  });
}

function deliver(repository, id, valid) {
  return signedWebhook("workflow_run", {
    action: "completed", installation: { id: 702 }, repository, workflow_run: state.runs[id].run,
  }, valid);
}

function statusFor(id, status) {
  return until(async () => (await db.query("SELECT status FROM ci_import_jobs WHERE workflow_run_id = $1", [id])).rows[0]?.status === status);
}

before(async () => {
  directory = await mkdtemp(join(tmpdir(), "effictiv-github-test-"));
  stateFile = join(directory, "state.json");
  await saveState();
  await db.connect();
  await db.query(`CREATE SCHEMA ${schema}`);
  schemaCreated = true;
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const env = {
    ...process.env, DATABASE_URL: testUrl.href, EFFICTIV_URL: base, NEXT_TELEMETRY_DISABLED: "1",
    EFFICTIV_TOKEN_KEY: randomBytes(32).toString("base64"), GITHUB_APP_CLIENT_ID: "test-app",
    GITHUB_APP_CLIENT_SECRET: "test-oauth-secret", GITHUB_APP_SLUG: "effictiv-test",
    GITHUB_APP_PRIVATE_KEY: privateKey.export({ format: "pem", type: "pkcs8" }),
    GITHUB_APP_WEBHOOK_SECRET: webhookSecret, EFFICTIV_GITHUB_TEST_STATE: stateFile, CRON_SECRET: cronSecret,
  };
  await exec(process.execPath, ["scripts/migrate.mjs"], { env, timeout: 40_000 });
  server = spawn(process.execPath, [
    "--import", "./tests/github-ci-stub.mjs", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port,
  ], { env });
  for (const stream of [server.stdout, server.stderr]) stream.on("data", (chunk) => { logs += chunk; });
  await until(async () => (await request("/login").catch(() => null))?.ok);
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
  await db.end().catch(() => undefined);
  if (directory) await rm(directory, { recursive: true, force: true });
});

test("accounts, scoped repositories and automatic CI energy imports", async (t) => {
  let alice;
  let bob;
  let raw;
  let expected;
  let artifactPath;

  await t.test("registration, login, import replay and cross-account access", async () => {
    assert.equal((await request("/dashboard")).status, 307);
    assert.match(await (await request("/register")).text(), /Create an account/);
    await authorize("alice", true);
    alice = await authorize("alice");
    await authorize("alice");
    bob = await authorize("bob");
    const accountRows = await db.query("SELECT login, github_access_token FROM accounts ORDER BY login");
    assert.deepEqual(accountRows.rows.map(({ login }) => login), ["alice", "bob"]);
    assert.ok(accountRows.rows.every(({ login, github_access_token }) => !github_access_token.includes(login)));
    assert.equal((await importRepo(publicRepo, alice, "https://other.example")).status, 403);
    for (const repository of [publicRepo, privateRepo, publicRepo]) {
      const response = await importRepo(repository, alice);
      assert.equal(new URL(response.headers.get("location")).pathname, urlFor(repository));
    }
    assert.equal(Number((await db.query("SELECT count(*) FROM account_projects")).rows[0].count), 2);
    assert.match((await importRepo(privateRepo, bob)).headers.get("location"), /error=access/);
    for (const repository of [publicRepo, privateRepo]) {
      const path = `${apiFor(repository)}/ci-runs?scope=project&format=csv`;
      assert.equal((await request(path, { headers: { cookie: bob } })).status, 404);
      assert.equal((await request(path)).status, 404);
    }
    assert.equal((await request(`${apiFor(publicRepo)}/ci-runs`)).status, 404);

    const page = await browser.newPage();
    try {
      const [name, value] = alice.split("=");
      await page.context().addCookies([{ name, value, url: base }]);
      await page.goto(`${base}/dashboard/import`);
      await page.getByRole("heading", { name: "Import a repository" }).waitFor();
      await page.getByText(privateRepo.full_name, { exact: true }).waitFor();
      await page.goto(`${base}${urlFor(publicRepo)}`);
      await page.getByRole("heading", { name: publicRepo.full_name }).waitFor();
      await page.getByRole("link", { name: "Workflow file" }).waitFor();
      const workflow = await page.request.get(`${base}${urlFor(publicRepo)}/setup/effictiv-energy.yml`);
      assert.equal(workflow.status(), 200);
      assert.match(await workflow.text(), /npm ci[\s\S]*npm run build/);
    } finally {
      await page.close();
    }
  });

  await t.test("signed completion imports verified energy and deduplicates deliveries", async () => {
    raw = await capture(publicRepo, 9001);
    expected = summarizeEcoCiArtifact(ecoCiArtifactSchema.parse(raw));
    await saveState();
    assert.equal((await deliver(publicRepo, 9001, false)).status, 401);
    assert.equal((await db.query("SELECT count(*) FROM ci_import_jobs")).rows[0].count, "0");
    const deliveries = await Promise.all([deliver(publicRepo, 9001), deliver(publicRepo, 9001)]);
    assert.deepEqual(deliveries.map(({ status }) => status), [202, 202]);
    await statusFor(9001, "imported");
    const url = `${apiFor(publicRepo)}/ci-runs`;
    const response = await request(url, { headers: { cookie: alice } });
    assert.equal(response.status, 200);
    const { runs: [run, duplicate] } = await response.json();
    assert.equal(duplicate, undefined);
    assert.equal(run.jobWh, expected.jobWh);
    assert.equal(run.buildWh, expected.buildWh);
    assert.equal(run.artifactSha256, digest(raw));
    assert.ok(run.hasStoredArtifact);
    artifactPath = `${apiFor(publicRepo)}/ci-runs/${run.id}/artifact`;
    assert.equal(await (await request(artifactPath, { headers: { cookie: alice } })).text(), raw);
    assert.equal((await request(artifactPath, { headers: { cookie: bob } })).status, 404);
    const csv = await request(`${url}?format=csv&search=${run.commitSha.slice(0, 7)}`, { headers: { cookie: alice } });
    assert.equal(csv.status, 200);
    assert.match(await csv.text(), new RegExp(`,${run.jobWh},${run.buildWh},`));
  });

  await t.test("unsupported and failed outcomes stay distinct and mismatched artifacts are rejected", async () => {
    await capture(privateRepo, 9002, "unsupported");
    await capture(publicRepo, 9003, "failure");
    await capture(publicRepo, 9004, "wrong-repository");
    await saveState();
    await Promise.all([deliver(privateRepo, 9002), deliver(publicRepo, 9003), deliver(publicRepo, 9004)]);
    await statusFor(9002, "imported");
    await statusFor(9003, "imported");
    await statusFor(9004, "failed");

    const headers = { cookie: alice };
    const { runs: [unsupported] } = await (await request(`${apiFor(privateRepo)}/ci-runs?scope=project`, { headers })).json();
    assert.equal(unsupported.buildOutcome, "success");
    assert.equal(unsupported.jobWh, null);
    assert.equal(unsupported.buildWh, null);
    assert.match(unsupported.energyUnavailableReason, /four-vCPU/);

    const { runs } = await (await request(`${apiFor(publicRepo)}/ci-runs?scope=project`, { headers })).json();
    assert.equal(runs.length, 2);
    const failed = runs.find(({ runId }) => runId === "9003");
    assert.equal(failed.buildOutcome, "failure");
    assert.equal(failed.buildWh, null);
    assert.equal(failed.jobWh, expected.jobWh);

    const page = await browser.newPage();
    try {
      const [name, value] = alice.split("=");
      await page.context().addCookies([{ name, value, url: base }]);
      await page.goto(`${base}${urlFor(publicRepo)}`);
      const formatted = new Intl.NumberFormat("en", { maximumSignificantDigits: 6 }).format(expected.buildWh);
      await page.getByText(`${formatted} Wh/build`, { exact: true }).first().waitFor();
      await page.getByRole("table", { name: "CI build runs" }).getByText("Failed", { exact: true }).first().waitFor();
    } finally {
      await page.close();
    }
  });

  await t.test("manual sync and authenticated cron recover a temporary download failure", async () => {
    await capture(publicRepo, 9005, "manual");
    state.unavailable = [9005];
    await saveState();
    const sync = await request(`${apiFor(publicRepo)}/sync`, { method: "POST", headers: { cookie: alice, origin: base } });
    assert.match(sync.headers.get("location"), /sync=requested/);
    await until(async () => (await db.query(
      "SELECT tries FROM ci_import_jobs WHERE workflow_run_id = '9005' AND status = 'pending'",
    )).rows[0]?.tries === 1);
    assert.equal((await request("/api/internal/ci-sync")).status, 401);
    state.unavailable = [];
    await saveState();
    await db.query("UPDATE ci_import_jobs SET due_at = now() WHERE workflow_run_id = '9005'");
    assert.equal((await request("/api/internal/ci-sync", { headers: { authorization: `Bearer ${cronSecret}` } })).status, 204);
    await statusFor(9005, "imported");
  });

  await t.test("workload artifact replay, private report, setup download and score", async () => {
    await capture(privateRepo, 9100, "workload");
    await saveState();
    await Promise.all([deliver(privateRepo, 9100),deliver(privateRepo, 9100)]);
    await statusFor(9100, "imported");
    assert.equal((await db.query("SELECT count(*) FROM efficiency_reports WHERE repository_id=602")).rows[0].count,"1");
    const page = await browser.newPage();
    try {
      const [name,value] = alice.split("=");
      await page.context().addCookies([{name,value,url:base}]);
      await page.goto(base+urlFor(privateRepo));
      await page.getByText("Project target score",{exact:true}).waitFor();
      await page.getByText("80 / 100",{exact:true}).first().waitFor();
      await page.getByText("improved",{exact:true}).waitFor();
      await capture(privateRepo, 9101, "workload");
      await saveState();
      await deliver(privateRepo, 9101);
      await statusFor(9101, "imported");
      await page.reload();
      await page.getByText("Target score history", {exact:true}).waitFor();
      assert.equal(await page.getByRole("link",{name:/score 80/}).count(),2);
      const download=await page.request.get(base+urlFor(privateRepo)+"/setup/effictiv-workloads.yml");
      assert.equal(download.status(),200);
      assert.match(await download.text(), /Effictiv workload efficiency/);
      const denied=await request(urlFor(privateRepo),{headers:{cookie:bob}});
      assert.doesNotMatch(await denied.text(),/1500|Project target score/);
    } finally { await page.close(); }
  });

  await t.test("GitHub permission loss, App removal and logout revoke reads", async () => {
    state.revoked = [publicRepo.id];
    await saveState();
    assert.equal((await request(artifactPath, { headers: { cookie: alice } })).status, 404);
    assert.equal((await request(`${apiFor(publicRepo)}/ci-runs?scope=project`, { headers: { cookie: alice } })).status, 404);
    assert.equal((await signedWebhook("installation_repositories", {
      action: "removed", installation: { id: 702 }, repositories_removed: [{ id: privateRepo.id }],
    })).status, 202);
    assert.equal((await request(`${apiFor(privateRepo)}/ci-runs?scope=project`, { headers: { cookie: alice } })).status, 404);
    assert.equal((await request("/api/auth/logout", { method: "POST", headers: { cookie: alice, origin: base } })).status, 303);
    assert.equal((await request("/dashboard", { headers: { cookie: alice } })).status, 307);
  });
});
