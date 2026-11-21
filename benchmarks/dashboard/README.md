# Dashboard benchmark v1

The functional unit is one completed visit to the production `/dashboard`. Run each path in its own Green Metrics Tool (GMT) run.

| Path | Success assertion |
| --- | --- |
| `landing` | The Energy & Carbon Trend responds to keyboard focus and shows the Sep 6 energy reading of 1,675 kWh within the initial viewport. |
| `scroll` | The landing assertion passes, then scrolling reveals the Service Energy Profile. Its Energy tooltip shows `reindex-all` at 100% and `etl-batch` at 51%. |

Those chart values are part of the dashboard's sample data. The benchmark measures the work of rendering and interacting with that data. `fixture.json` fixes the sample date, Chromium version, UTC timezone, locale and 1440 × 800 viewport. A fresh browser context for each visit keeps client cache and storage cold. The browser loads loopback resources and blocks third-party requests, including the external avatar. The app and browser share the same container.

## Record energy with GMT

Use a dedicated native Linux x86-64 runner with Docker, sufficient disk for the production build, and readable CPU package RAPL MSRs via GMT's installed provider. The Linux GMT installation configures the runner's PostgreSQL service and the necessary host permissions. Build dependencies come from Docker Hub, npm, Debian, Playwright's browser CDN and Google Fonts. [GMT v4.2](https://github.com/green-coding-solutions/green-metrics-tool/tree/v4.2) · [Installation](https://docs.green-coding.io/docs/installation/installation-overview/)

In the GMT checkout's `config.yml`, enable `cpu_energy_rapl_msr_component` under `measurement.metric_providers.linux` with `sampling_rate: 99`. Configure the machine description for this runner. From a clean Effictiv checkout, run the two paths with 30 visits each.

```bash
GMT_DIR=/absolute/path/to/green-metrics-tool \
  benchmarks/dashboard/run.sh gmt "$(mktemp -d)/dashboard" 30
```

The script uses the GMT checkout's `venv/bin/python`. Set `GMT_PYTHON` to the absolute path to its Python executable if installed elsewhere. Increase the visits per path if the batch is too short for reliable counter sampling and keep the count fixed across comparisons.

GMT builds the app during installation and starts it during boot. The `Dashboard visits` phase covers the browser launch, visit batch and browser teardown. The RAPL totals are in microjoules (`uJ`), one reading per CPU package. They include Chromium, Next.js, and other activity on the same packages. Coverage excludes discrete GPU, DRAM as a separate domain, disks, networking equipment and power supply losses. On-chip domains included by the package counter depend on the processor. Use the same isolated runner and sensor settings for comparable runs.

## Run the functional check

The same production image and Chromium assertions run locally on Linux x86-64 with Docker and Python 3.9 or later.

```bash
benchmarks/dashboard/run.sh smoke "$(mktemp -d)/dashboard" 3
```

Functional mode reports energy as `unavailable`. GMT mode uses a functional-only GMT run if `/dev/cpu/0/msr` is absent. An installed GMT run with no RAPL totals also reports `unavailable` with a reason. A collected zero remains a numeric reading.

## Read and retain the artifacts

- Each path writes a versioned `.json` result and its original `.log` to the output directory. The JSON contains the source commit, fixture digests, collector version, hardware profile, assertion outcome, completed and failed counts, and original energy readings. The raw log contains GMT's phase-stat rows and browser output. Its SHA-256 is in the result.
- Time to usable is measured from navigation start to the successful trend interaction. Time to assertion extends through the last required interaction for the selected path. Transferred bytes sum response headers and encoded response bodies for requests that finish by that assertion.
- A failed visit makes the path fail and the command exit nonzero. The log preserves any collector diagnostics and the result records whether the run passed.
- For the first sensor-backed run, retain the JSON and log together with the native GMT samples from `/v1/measurements/single/<sourceRunId>` on your GMT API. Add a small sanitized extract from that real run to use as the ingestion adapter fixture. [GMT export endpoint](https://github.com/green-coding-solutions/green-metrics-tool/blob/v4.2/api/scenario_runner.py)

## First run status

The cloud runner exposes no RAPL MSR devices. The real-energy acceptance check and sanitized GMT energy fixture are pending a compatible runner. The committed smoke fixture records the browser checks and the unavailable energy reading.

On `218b033`, `npm ci` and `npm run build` passed. `npm run lint` reported four errors and 22 warnings. The errors are pre-existing explicit `any` types in `components/deployments-module.tsx` and `components/site-header.tsx`.
