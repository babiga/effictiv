# Dashboard comparison pilot

Live Benchmarks compares the energy used by two commits for the same production dashboard visit. Landing and scroll have separate verdicts. The verdict describes CPU package energy on the benchmark runner. The comparison page links every calibration and comparison run to its retained source log.

## Policy v1

Collect six baseline-versus-baseline calibration pairs and six baseline-versus-candidate pairs per scenario. Each repetition has 30 visits. Alternate which side runs first. Use the same disposable runner, pinned collector and Playwright fixture for the whole capture. Build both application images before starting the capture.

For each pair, subtract the baseline Wh per completed visit from the candidate Wh per completed visit. The interval spans the smallest to largest of the six paired differences. Its nominal two-sided coverage for the median is 96.875% under independent pairs. The noise threshold is the greater of the largest absolute calibration difference and 1% of the median calibration baseline Wh per visit. The entire interval must strictly clear the threshold to report improvement or regression. Other eligible results are inconclusive. An incomplete pair, failed assertion, unavailable reading, or mismatched workload makes the scenario ineligible.

## Enable the workflow

1. Apply `npm run db:migrate` to the pilot database and deploy the app. Configure `EFFICTIV_PILOT_WRITE_TOKEN` on the app server.
2. Provision a single-use Linux x86-64 GitHub Actions runner with the `effictiv-rapl-disposable` label. Use a dedicated host with readable `/dev/cpu/0/msr`, Docker, and the pinned GMT v4.2 installation. Enable the CPU package RAPL provider and give the local GMT user the host orchestrator capability so the trusted scenario can dispatch the browser inside its container. Retire the runner after the job. Give it no deployment credentials or access to shared infrastructure. [GMT setup](../benchmarks/dashboard/README.md#record-energy-with-gmt)
3. Create the `effictiv-comparison-publisher` GitHub environment and restrict deployments to `main`. Set the environment variable `EFFICTIV_URL` to the HTTPS app origin and the environment secret `EFFICTIV_PILOT_WRITE_TOKEN` to the app's pilot token.
4. Set the repository variable `EFFICTIV_RAPL_ENABLED=true` once a runner is ready. Set `EFFICTIV_RAPL_GMT_DIR` if GMT is installed outside `/opt/green-metrics-tool`.
5. Dispatch **Dashboard commit energy comparison** from `main` with a pull request number. Run once with the A/A control selected and once for the PR head. The advisory run summary links the commits and both scenarios. Retry only the failed publishing job to reuse the original measurement artifact. A new capture gets a separate attempt. [Workflow](../.github/workflows/dashboard-commit-comparison.yml)

The capture job runs the checked-in harness from the trusted workflow commit. It builds PR source inside Docker with the trusted build recipe and supplies no Actions or upload credentials to the build. During measurement, the app and the trusted browser run in separate unprivileged containers with a shared loopback namespace and no runner mounts or RAPL devices. Only the host GMT process reads the sensor. The public logs include the native CPU package phase totals and the browser's benchmark summary.

## Verify with fixtures

Use a disposable PostgreSQL database. The integration suite creates and removes its own schema.

```bash
npm ci
npm ci --prefix benchmarks/dashboard
benchmarks/dashboard/node_modules/.bin/playwright-core install chromium --only-shell
npm run build
EFFICTIV_TEST_DATABASE_URL="$TEST_DATABASE_URL" npm run test:comparisons
```

The automated fixtures cover verdicts, schema validation, publisher provenance, publication replay, database rollback, project isolation, and the browser evidence trail. Live RAPL capture and the real GMT export replay remain pending until a compatible runner is available.
