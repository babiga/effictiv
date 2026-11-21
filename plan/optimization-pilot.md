# Dashboard optimization pilot

The first live recommendation proposes mounting the Service Energy Profile chart when it first enters the viewport. Live Recommendations shows the hypothesis, registered change, both comparison results, and the transition history. The Demo view contains sample recommendations and estimates.

## Register the experiment

Deploy the recommendation infrastructure and apply `npm run db:migrate` to the pilot database. Open the chart change as its own PR against the migrated infrastructure revision. Register the exact base and head SHAs before the benchmark captures either path. Use the same measured workload and fixture on both commits.

The trusted events endpoint uses the app's existing pilot upload credential. Set `EFFICTIV_URL` to the app origin and use full Git SHAs. The values below come from the chart PR.

```bash
event_url="$EFFICTIV_URL/api/v1/projects/1306723014/recommendations/defer-service-energy-profile/events"

jq -n --argjson pr "$PR_NUMBER" --arg base "$BASE_SHA" --arg head "$HEAD_SHA" \
  '{type: "implement", pullRequest: $pr, baselineSha: $base, implementationSha: $head}' |
  curl --fail-with-body -sS "$event_url" \
    -H "Authorization: Bearer $EFFICTIV_PILOT_WRITE_TOKEN" \
    -H 'Content-Type: application/json' --data-binary @-
```

Dispatch the existing advisory workflow from `main` on a compatible RAPL runner with the chart PR number and the A/A control option off. After publication, use the comparison IDs from the landing and scroll links in the run summary. Attach the two IDs from the same workflow attempt.

```bash
jq -n --arg landing "$LANDING_COMPARISON_ID" --arg scroll "$SCROLL_COMPARISON_ID" \
  '{type: "verify", landingComparisonId: $landing, scrollComparisonId: $scroll}' |
  curl --fail-with-body -sS "$event_url" \
    -H "Authorization: Bearer $EFFICTIV_PILOT_WRITE_TOKEN" \
    -H 'Content-Type: application/json' --data-binary @-
```

An identical replay returns the existing event. A new matching capture can add another verification result. A trusted `{"type":"dismiss"}` event closes the recommendation while retaining its evidence and results. Public reads are scoped to the project at `GET /api/v1/projects/1306723014/recommendations`. [Comparison runner setup](comparisons-pilot.md)

## Verification policy v1

Landing must show an improvement under the calibrated energy comparison policy. Scroll must be eligible with an upper paired-difference bound at or below its calibrated regression threshold. Successful visits from the six comparison pairs supply each side's nearest-rank p95. The allowed slowdown is 100 ms for the landing time to usable and 200 ms through the scroll assertion. Failed gates produce an Inconclusive recommendation with the comparison evidence and reasons. The dashboard reports measured Wh per visit.

Run `EFFICTIV_TEST_DATABASE_URL="$TEST_DATABASE_URL" npm run test:comparisons` against a disposable database after a production build for fixture-based API and browser verification. Live acceptance requires a retained real energy comparison and both latency results.
