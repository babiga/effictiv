import http from "k6/http";
import crypto from "k6/crypto";
import { Counter } from "k6/metrics";
const good = new Counter("valid_responses"), bodyBytes = new Counter("response_body_bytes");
export const options = { vus: 1, iterations: Number(__ENV.REQUEST_COUNT), maxRedirects: 0, summaryTrendStats: ["p(95)"] };
export default function () {
  const res = http.get(__ENV.BENCH_URL, {responseType:"binary",timeout:"10s"});
  const valid = res.status === 200 && res.body && crypto.sha256(res.body,"hex") === __ENV.EXPECTED_DIGEST;
  good.add(valid ? 1 : 0);
  bodyBytes.add(res.body ? res.body.byteLength : 0);
}
export function handleSummary(data) {
  const value = name => data.metrics[name].values;
  return {stdout: JSON.stringify({completed:value("valid_responses").count,
    bytes:value("response_body_bytes").count, p95Ms:value("http_req_duration")["p(95)"]})};
}
