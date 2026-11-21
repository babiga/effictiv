# Effictiv technical implementation plan

**First release.** A GitHub maintainer can open a pull request, compare the energy used by two commits to complete the same dashboard visit, and trace the result to the underlying runs. Success includes a defensible “inconclusive” verdict. A reduction earns a verified label only when a follow-up experiment demonstrates it.

## Starting point

This plan targets `babiga/effictiv` at `2cd2328`. The prototype brief in `effictiv-instruction.md` describes a mock-only dashboard. The live pilot extends that brief. Keep the existing Next.js App Router, TypeScript, shadcn/ui and Recharts components. Give sample data an explicit demo mode. In a live project, unavailable measurements get an empty state.

| Existing entry point | First change |
| --- | --- |
| `app/dashboard/page.tsx` | Thread the selected project and data mode through Measurements, Benchmarks and Recommendations. Remove the local applied-count dependency from live totals. |
| `components/measurements-module.tsx` | Read persisted observations and export the same filtered records shown in the table. Show the collector, unit, boundary and source artifact for each run. |
| `components/benchmarks-module.tsx` | Compare matched runs. Display both commits, successful work, energy per task, spread and the reason for the verdict. |
| `components/recommendations-module.tsx` | Replace the simulated apply action in live mode with a hypothesis, linked change, and verification result. |
| `components/dashboard-module.tsx` and `lib/mockData.ts` | Keep fixtures available in demo mode. In live mode, surface only metrics backed by the selected project's records, including when a user changes a filter. |

## Measurement contract

Use one versioned schema at the ingestion boundary. Validate with the repository's Zod dependency. Keep raw collector output as a versioned artifact and normalize observations into PostgreSQL. A trusted import job sends results to the Next.js API. Collectors run on benchmark infrastructure outside the web application.

| Record | Required information |
| --- | --- |
| Project and scenario | GitHub repository ID, scenario ID and revision, fixture digest, functional unit such as one completed dashboard visit, and explicit success assertion |
| Run | Commit SHA, source run ID and attempt, collector and version, timestamps, runner identity, hardware profile, cache policy, scope, raw artifact reference and digest |
| Observation | Metric, value and unit, sensor or model, covered hardware or activity, observation window, completed and failed tasks, and data quality flags |
| Comparison | Base and candidate runs, policy version, repetitions, per-task values, absolute and relative delta where defined, spread, verdict and reason |
| Recommendation | Evidence, suspected cause, proposed change, implementation commit, verification comparison and status |

Use Wh for stored energy. Convert joules to Wh by dividing by 3,600. Preserve the original value and unit. For a run with completed work, divide the energy for the measured interval by the number of successful tasks. Retain failed-task counts and invalidate a comparison when its correctness check fails. Zero completed tasks yields an undefined rate. Missing readings and zero readings must remain distinguishable.

Operational emissions in gCO₂e equal energy in kWh multiplied by the grid intensity in gCO₂e/kWh. Save the factor source, region, applicable time period and version. Without a supported factor, display energy alone. Use a common factor when attributing a change to software efficiency. Report actual grid conditions separately when evaluating scheduling. A Software Carbon Intensity claim also requires allocated embodied emissions, a defined boundary and a functional unit. [SCI specification](https://github.com/Green-Software-Foundation/sci/blob/main/SPEC.md)

## Implementation sequence

Each milestone is a separately reviewable change. Use the existing lockfile and record the baseline results of `npm ci`, `npm run lint` and `npm run build` before editing application code. Repeat the relevant checks in each PR and distinguish existing failures from new ones.

### Milestone checklist

Check an item when its evidence is available. Link the implementation PR or acceptance artifact when the item is checked.

1. **Dashboard benchmark**
   - [x] Merge the scenario and reproduction guide. [PR #2](https://github.com/babiga/effictiv/pull/2)
   - [x] Capture landing and scroll smoke results. [Smoke artifacts](../benchmarks/dashboard/fixtures/smoke-v1/)
   - [ ] Run both paths on a compatible RAPL runner and commit the sanitized GMT export.
2. **Persist runs and connect Measurements**
   - [x] Implement the PostgreSQL migration, trusted importer, and Live Measurements with CSV. [PR #3](https://github.com/babiga/effictiv/pull/3) · [Pilot setup](measurements-pilot.md)
   - [x] Verify PostgreSQL, browser, and CSV behavior using smoke and test fixtures. [Integration test](../tests/measurements.test.mjs)
   - [ ] Replay a real GMT energy export and verify its energy, source, and deduplication in Measurements and CSV.
3. **Compare commits and publish a GitHub summary**
   - [ ] Implement matched repetitions, the comparison policy, and the GitHub run summary.
   - [ ] Verify the A/A control, invalid comparison, improvement and regression, and publication replay.
4. **Verify an optimization**
   - [ ] Persist one recommendation, its patch, and its verification comparison.
   - [ ] Verify both dashboard paths against a declared latency budget and publish the evidence trail.
5. **Add CI energy**
   - [ ] Import one repeatable Eco CI build job.
   - [ ] Verify replay and display build and visit energy with their respective boundaries.

### 1. Produce one real dashboard benchmark

- Add a versioned Green Metrics Tool scenario under `benchmarks/dashboard/`. Build the production app and start it with a fixed fixture, viewport and browser version. Exclude build time from the visit interval.
- Exercise two paths independently. First, open the dashboard and wait for an actionable chart. Second, open it, scroll to the lower chart and assert that its expected data renders. Capture completed visits, time to usable, transferred bytes and energy for each path. Batch visits if individual visits are below sensor resolution.
- Record sensor availability and exactly which machine components the reading covers. State whether the browser is inside that boundary. Use a dedicated or isolated compatible runner for sensor-backed comparisons. A development machine without a sensor can replay a captured fixture to exercise the importer.
- **Acceptance.** Repeating the documented command on a compatible host produces a raw artifact with a successful assertion, positive completed-work count, collector version, hardware description and interpretable energy unit. Missing sensors produce an explicit unavailable result. Keep one small sanitized real export as the adapter contract fixture.

### 2. Persist runs and connect Measurements

- Add a forward database migration for projects, scenarios, runs and observations. Implement `POST /api/v1/runs` for trusted uploads and a paginated, project-scoped read path for Measurements. Start with the public Effictiv pilot project and a server-side, project-scoped write credential. Keep the credential outside the browser bundle.
- Normalize the real export from milestone 1. Use a unique key covering project, collector, source run, attempt and scenario repetition. Insert the run and observations in one transaction. An identical replay returns the original run ID. A changed payload under that key returns a conflict. Save a digest for this check.
- **Acceptance.** Upload the captured result twice, including concurrent requests. The UI and CSV show one run. A malformed unit or unauthorized upload stores no rows. A database error surfaces as a retryable failure. Reloading the page preserves the data. A fresh live project shows zero records.

### 3. Compare commits and publish a GitHub summary

- Interleave baseline and candidate repetitions on the same runner. Fix the scenario, fixture, browser, cache policy, sensor, workload and measurement boundaries. Start with at least five matched pairs and calibrate a noise band using repeated runs of an unchanged commit. Save the policy and sample count alongside every verdict.
- Compare paired differences in Wh per completed visit. Use a documented interval for the median paired change and a predeclared minimum meaningful effect based on the unchanged-commit calibration. Show improved or regressed only if the entire interval clears the corresponding threshold. Otherwise show inconclusive. Treat mismatched conditions and correctness failures as ineligible and show the reason. Suppress percentage deltas for a zero baseline.
- Add a GitHub Actions workflow that produces a run summary linking commits, raw results and the Effictiv comparison. Allowlist the pilot repository. Execute untrusted PR code on isolated disposable infrastructure without upload credentials. A separate trusted publishing step validates artifact shape, size and repository/run identity. Use read-only workflow permissions except for the specific publishing permission needed. Begin with advisory results.
- **Acceptance.** An A/A control, an intentionally invalid scenario and deterministic fixtures for improvement and regression exercise each verdict. Rerunning publication updates the same comparison. From GitHub, a reviewer can reach both source runs.

### 4. Verify an optimization

- Start with one testable hypothesis, such as deferring the lower chart until it enters the viewport. Link the recommendation to its baseline, patch and verification run. Expose suggested, implemented, verified, inconclusive and dismissed states. Persist state transitions. Allow verification only via a passing comparison.
- Run both dashboard paths to catch work deferred until scroll. Record a latency budget before the experiment and require correctness on both paths. Report the measured change per scenario. Projecting a total saving requires an independently sourced workload volume and a stated period.
- **Acceptance.** One actual change has a complete evidence trail. A noisy or unfavorable result is visible. Clicking a button or dismissing an item never increases reported savings. Reverting the UI to demo mode remains possible while preserving captured live data.

### 5. Add CI energy as a second integration

- Instrument one repeatable GitHub Actions job with Eco CI. Import its reported energy as a modeled CI observation with runner, job and step identifiers. Track Wh per successful build plus total job energy. Keep step totals, job totals and application benchmark scopes identifiable.
- **Acceptance.** The same commit can show application energy per visit and CI energy per build. An overlapping job total and benchmark are never added to form a project footprint. Replaying the same job artifact yields one result.

## Integration roadmap

| Project | When to integrate | Result and boundary |
| --- | --- | --- |
| [Green Metrics Tool](https://github.com/green-coding-solutions/green-metrics-tool) | Milestone 1 | Scenario energy for the declared sensors and interval |
| [Eco CI](https://github.com/green-coding-solutions/eco-ci-energy-estimation) | Milestone 5 | Modeled energy for CI jobs and steps |
| [Kepler](https://github.com/sustainable-computing-io/kepler) | First Kubernetes pilot with cluster access | Energy attributed to cluster workloads. Record attribution method and node coverage. |
| [Scaphandre](https://github.com/hubblo-org/scaphandre) | First pilot with a supported operator-managed host | Host readings and process allocations. Retain parent host scope to prevent aggregation overlap. |
| [CodeCarbon](https://github.com/mlco2/codecarbon) | First Python or ML batch workload | Energy and estimated emissions per job with the device coverage and regional assumptions used |
| [CO2.js](https://github.com/thegreenwebfoundation/co2.js) | First team comparing web delivery changes | Modeled emissions for transferred bytes. Save the model version, byte count and assumptions. |
| [Boavizta API](https://github.com/Boavizta/boaviztapi) | A pilot can supply equipment inventory and an allocation basis | Estimated hardware manufacturing impacts. Record lifetime and share allocated to the workload. |

For each later adapter, require a pinned upstream version, a representative export, an explicit unit conversion, a boundary-overlap test and one real pilot run. Expand to production totals when a team can supply actual workload volume. Defer water and material claims until a defensible source, region and allocation method exist.

## First Codex assignment

Implement milestone 1 in a single PR. Read the prototype brief and inspect the actual dashboard before choosing the success assertion. Include the scenario, exact reproduction command, required runner capabilities and a short result showing which components the sensor covers. If hardware is unavailable, ship the reproducible scenario and successful functional checks, then explicitly mark the real-energy acceptance check pending until a compatible runner supplies evidence.
