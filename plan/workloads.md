# Measure a repository with Effictiv

Import the repository in Effictiv. From its Workload efficiency panel download the workflow and save it as `.github/workflows/effictiv-workloads.yml`. Push it to the default branch. The first report lists tracked file sizes, image dimensions for the largest images, duplicates and the biggest byte changes. A static scan needs no application setup. Source stays in GitHub Actions. Effictiv imports the private report through the project's existing GitHub App access.

Add `.effictiv.yml` at the repository root to measure real work. The following configuration illustrates three independent workloads. Replace the commands, ports, assertions, budgets and digests with your project's own. Calculate digests from known correct output, including any final newline.

```yaml
version: 1
workloads:
  - id: home
    kind: page
    unit: visit
    metric: transferBytes
    budget: 1000000
    setup: npm ci && npm run build
    server: exec npm run start -- --port 3034
    url: http://127.0.0.1:3034/
    selector: h1
    expectedText: Home

  - id: catalog
    kind: http
    unit: response
    metric: cpuSeconds
    per: 1000
    budget: 20
    maxP95Ms: 150
    setup: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
    server: exec .venv/bin/python -m uvicorn api:app --port 8034
    url: http://127.0.0.1:8034/catalog
    requests: 1000
    expectedSha256: REPLACE_WITH_SHA256_OF_EXPECTED_RESPONSE_BODY

  - id: transform
    kind: command
    unit: record
    metric: cpuSeconds
    per: 1000
    budget: 2
    units: 10000
    fixtures: [fixtures/records.csv]
    command: python3 transform.py fixtures/records.csv
    expectedSha256: REPLACE_WITH_SHA256_OF_EXPECTED_STDOUT
```

The collector runs the candidate's workload definition on both checkouts. Setup runs once per checkout per workload. Pin dependencies and seed inputs in setup. List input files under `fixtures` to require matching bytes on both sides. Use a foreground server and a stable local URL for services. Command benchmarks should emit their completed output to stdout and diagnostics to stderr. Each repetition must begin from the same application state. The configured `units` describes the work in the known output.

## Read a comparison

Pushes compare the previous default-branch tip with the new commit. Same-repository pull requests compare their base and head. To select another pair, choose **Compare another pair**, then **Run workflow** on the default branch and enter full commit SHAs available in the repository. The run summary and downloadable JSON identify both commits. Select a previous run in the repository dashboard to revisit its evidence.

The browser opens a cold 390 × 844 viewport. It records network transfer, resource types, LCP and visible text. Lighthouse inspects image delivery on a separate navigation. HTTP uses k6 to validate HTTP 200 and the full response-body digest on every request. HTTP bytes are response body bytes. Server CPU time covers its Linux process group during the load test. Peak RSS is sampled every 20 ms and can miss short-lived spikes. Batch CPU and peak RSS come from Linux child-process accounting. A command passes only when it exits successfully with the expected stdout digest.

Each scenario declares one primary metric and budget. The options are `transferBytes`, `cpuSeconds`, `elapsedMs`, `peakRssBytes` and `energyWh`. A workload at or below budget earns 100. Above budget the score is the rounded ratio of budget to observed cost multiplied by 100. Peak RSS is per execution. All other budgets use the declared number of completed units. The project score is the equal-weight mean when every configured workload has a valid score.

Six baseline/baseline pairs calibrate noise and six baseline/candidate pairs alternate order on the same runner. All paired differences must clear the larger of the maximum control difference and 1% of the baseline median. Failed output checks, missing primary readings or an exceeded p95 budget prevent a verified improvement. The project panel shows measured units, the base and head values, evidence-backed suggestions, and the effect projected to 1,000 units. Only model estimates have a CO₂e label. For a usage-based projection, select the workload and supply the month and actual completed unit count.

## Energy and equivalences

Eco CI continues to estimate dependency installation and build energy through the separate CI workflow. CO2.js 0.19.0 uses SWD v4 with its global grid assumptions and green hosting factor zero to estimate cold web delivery emissions. Estimates include delivery, device and data-center activity. Do not add them to runner energy. Small changes are displayed in bytes, Wh or grams. At larger scales the dashboard uses the EPA estimate of 0.060 metric tons of CO₂ per year averaged over ten years for a US urban tree. [CO2.js](https://developers.thegreenwebfoundation.org/co2js/overview/) · [EPA methodology](https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references)

For optional sensor-backed command measurements use workflow dispatch on a dedicated, disposable Linux x64 runner labeled `effictiv-rapl-disposable`. Set the repository variable `EFFICTIV_RAPL_GMT_DIR` to a Green Metrics Tool v4.2 checkout with its database and RAPL provider configured. Select **sensor**. The scenario must work independently on both revisions. Set `gmt: { file: benchmarks/usage_scenario.yml, phase: Work }` on the command. Run the same command and input in that GMT phase and print one line `EFFICTIV_RESULT <actual output SHA-256> <completed units>` derived from its actual result. Effictiv validates that proof and reads the named phase's host CPU package totals in µJ. It stores Wh and the covered packages separately from the process readings. Without a configured sensor, an energy budget stays unscored. [GMT measurement setup](https://docs.green-coding.io/docs/prologue/measurement-process/)

## Rollout

Run `npm run db:migrate` with the application's PostgreSQL connection before deploying the app. Install the workflow on a repository and open its first completed Actions run. Use **Sync now** to retry its import. Existing CI captures and pilot records remain accessible. The workflow requires GitHub Actions on Linux x64 and read access to repository contents during checkout. It retains the repository's report as a GitHub artifact and Effictiv keeps the imported report under the repository's existing access controls.
