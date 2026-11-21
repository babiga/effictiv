# Measurements pilot

The Measurements tab opens in Live mode for `babiga/effictiv`. Use Demo to browse the sample dashboard records. Live runs show their collector, completed work, energy scope, and source log. A fresh database has no runs.

## Set up PostgreSQL

Use Node.js 20.9 or later and PostgreSQL 14 or later. Set `DATABASE_URL` to the PostgreSQL connection URL and `EFFICTIV_PILOT_WRITE_TOKEN` to a random secret in the server environment. Use the same secret in the trusted import job. The database connection is opened when an API request needs it, so builds can run without database credentials.

```bash
npm ci
npm run db:migrate
npm run build
npm run start
```

Run the migration once against the selected database before enabling live reads or imports in a deployment. The migration runner records completed migrations and supports repeat execution.

## Import a benchmark run

Keep the versioned result JSON beside its original collector log. Retain the raw log at a durable HTTPS URL accessible to the readers of the public pilot. Set `EFFICTIV_URL` to the target app origin. The import command defaults to `http://127.0.0.1:3000`, verifies the local log's SHA-256, and sends the result to the app.

```bash
npm run import:run -- /path/to/dashboard/landing.json "$RAW_LOG_URL" 1 1
```

The final arguments are the source attempt and scenario repetition. Both default to `1`. Use the same values when retrying an upload. The API deduplicates by project, collector, source run, attempt, scenario, and repetition. When the collector supplies no native run ID, the source log digest identifies the run.

`POST /api/v1/runs` accepts the Bearer token and a JSON object with `repositoryId` (`"1306723014"`), `attempt`, `repetition`, `artifactUrl`, and `result` (the v1 collector JSON). `201` creates a run, `200` returns the ID of an identical upload, `409` reports a changed result under the same identity, and `503` is retryable. The importer accepts completed workload summaries with either available or unavailable energy.

`GET /api/v1/projects/1306723014/runs` accepts optional `scenario`, `search`, `limit`, and `cursor` parameters. The response contains `runs` and `nextCursor`. Use `format=csv` with the same filters and omit `cursor` to download all matching runs. Stored energy is in Wh. The original package units and readings remain available alongside it. A blank energy value means the collector reported energy unavailable.

## Verify locally

Use a disposable PostgreSQL database. The integration suite creates and removes its own schema. It uses the captured Playwright smoke artifacts for replay and synthetic RAPL readings for unit conversion, measured zero, and failing assertions.

```bash
npm ci --prefix benchmarks/dashboard
benchmarks/dashboard/node_modules/.bin/playwright-core install chromium --only-shell
npm run build
EFFICTIV_TEST_DATABASE_URL="$TEST_DATABASE_URL" npm run test:measurements
```
