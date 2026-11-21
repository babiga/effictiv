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

## Web delivery estimates

Live Measurements shows gCO₂e per visit for passing dashboard runs with a complete set of transfer readings. The `webDeliveryEstimate` object and CSV include modeled total and per-visit emissions, exact transferred bytes, the CO2.js and model versions, and the assumptions. The benchmark counts response headers and encoded bodies for loopback requests that finish by the scenario’s last assertion. It opens a fresh browser context for each visit. [Benchmark methodology](../benchmarks/dashboard/README.md)

CO2.js `0.19.0` applies Sustainable Web Design v4 to each visit’s bytes using the global grid factor of 494 gCO₂e/kWh and a green hosting factor of zero. The model includes operational and embodied emissions for the network, data center, and visitor device. It uses lab transfers as a proxy for web delivery and estimates emissions even when CPU energy is unavailable. Its device and data-center boundaries can overlap measured CPU activity, so the UI reports the estimate alongside the separate Wh reading. [CO2.js v0.19.0](https://github.com/thegreenwebfoundation/co2.js/tree/v0.19.0)

The November 21, 2026 pilot ran the production build with Playwright on the host. Each capture was imported and replayed against PostgreSQL 17.12. Each replay returned the original run ID. Live Measurements, the API, and CSV showed one estimate per capture while CPU energy was unavailable.

| Capture | Completed visits | Bytes per visit | Total bytes | Modeled gCO₂e per visit |
| --- | ---: | ---: | ---: | ---: |
| [Dashboard landing](../benchmarks/dashboard/fixtures/co2js-pilot-v1/landing.log) | 3 | 557,935 | 1,673,805 | 0.082685967 |
| [Dashboard scroll](../benchmarks/dashboard/fixtures/co2js-pilot-v1/scroll.log) | 3 | 557,935 | 1,673,805 | 0.082685967 |

For an existing pilot, pause the trusted uploader and let in-flight imports finish. Run `npm run db:migrate` against the pilot database, deploy the updated app, then resume uploads. The migration backfills passing historical runs with complete byte observations. After rollout, replay a known upload and confirm it returns the same run ID and shows one estimate in Live Measurements and CSV.

## CI build energy

Run **Eco CI build energy** in GitHub Actions and download the `effictiv-eco-ci-<run>-<attempt>` artifact. Keep its JSON at a durable HTTPS URL. For the pilot, repository maintainers review the run identity and import the export manually using the same trusted credential and app URL as the dashboard importer. Apply `npm run db:migrate` to the target database before the first CI import. [Workflow](../.github/workflows/eco-ci-build.yml)

```bash
gh run download "$RUN_ID" --repo babiga/effictiv --name "effictiv-eco-ci-$RUN_ID-$ATTEMPT"
npm run import:ci-run -- effictiv-eco-ci.json "$ARTIFACT_URL"
```

`POST /api/v1/ci-runs` accepts the Bearer token and a JSON object containing `repositoryId`, `artifactUrl`, `artifactSha256`, and `artifact` as the original JSON text. `201` creates a run, `200` returns the ID of an identical artifact, and `409` reports changed bytes for the same repository, workflow run, attempt, and job. `GET /api/v1/projects/1306723014/ci-runs` accepts `search` for a commit prefix, `limit`, `cursor`, and `format=csv`. CSV exports all matching CI records.

The modeled job total covers dependency installation and the production build, including Eco CI overhead. Wh/build uses the `npm run build` phase when that command succeeds and its interval has a usable sample. The phase readings are part of the job total. The four-vCPU x64 preset models power from utilization and is calibrated for AMD EPYC. The GitHub-hosted pilot runner reported an Intel Xeon. Live Measurements includes both the reported CPU and preset for context. [Eco CI release](https://github.com/green-coding-solutions/eco-ci-energy-estimation/tree/v5.3.0)

| First GitHub-hosted capture | Joules | Watt-hours |
| --- | ---: | ---: |
| `npm ci` | 190.012 | 0.0527811111 |
| `npm run build` | 76.2101 | 0.0211694722 |
| Job interval | 267.175183212 | 0.07421532867 |

The build passed on November 21, 2026. The retained artifact is from workflow run `44943649169`, attempt `1`, and commit `9fd146b`. [GitHub run](https://github.com/babiga/effictiv/actions/runs/44943649169) · [Raw collector artifact](../benchmarks/eco-ci/fixtures/github-actions-44943649169.json)

## Verify locally

Use a disposable PostgreSQL database. The integration suite creates and removes its own schema. It uses the captured Playwright smoke artifacts for replay and synthetic RAPL readings for unit conversion, measured zero, and failing assertions.

```bash
npm ci --prefix benchmarks/dashboard
benchmarks/dashboard/node_modules/.bin/playwright-core install chromium --only-shell
npm run build
EFFICTIV_TEST_DATABASE_URL="$TEST_DATABASE_URL" npm run test:measurements
```
