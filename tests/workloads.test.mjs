import test from "node:test";
import assert from "node:assert/strict";
import {evaluate,projectScore,reportSchema,config} from "../collector/model.mjs";
import {insights} from "../collector/insights.mjs";
import {workloadReport} from "./workload-fixtures.mjs";

test("score uses the project's budget, including saturated and incomplete scores", () => {
  const r=reportSchema.parse(workloadReport()), w=r.workloads[0];
  assert.deepEqual(projectScore(r),{score:80,covered:1,total:1});
  assert.equal(insights(w).saved,250000);
  w.target.budget=2000;
  assert.equal(evaluate(w).score,100);
  assert.equal(evaluate(w).delta,-250);
  r.workloads.push({...w,error:"Output digest mismatch"});
  assert.deepEqual(projectScore(r),{score:null,covered:1,total:2});
});
test("noise, correctness, latency and missing meters have independent outcomes",()=>{
  const w=workloadReport().workloads[0];
  w.head=w.base; assert.equal(evaluate(w).verdict,"inconclusive");
  w.head=[...w.base.slice(1),{...w.base[0],completed:2}];
  assert.equal(evaluate(w).verdict,"ineligible");
  w.target.maxP95Ms=10;
  assert.equal(evaluate(w).score,null);
  delete w.target.maxP95Ms;
  w.target.metric="energyWh";
  assert.equal(evaluate(w).score,null);
  assert.equal(insights(w).saved,null);
});
test("peak RSS is per execution and cannot be projected per 1,000 requests",()=>{
  const w=workloadReport().workloads[0];
  w.target.metric="peakRssBytes";
  for(const s of [...w.calibration,...w.base,...w.head]) s.peakRssBytes=s.transferBytes;
  assert.equal(insights(w).verdict,"improved");
  assert.equal(insights(w).saved,null);
});
test("runtime contracts require a correctness check",()=>{
  const w={id:"api",kind:"http",unit:"response",metric:"cpuSeconds",budget:10,url:"http://localhost:3000/a",server:"python api.py"};
  assert.equal(config.safeParse({version:1,workloads:[w]}).success,false);
  w.expectedSha256="d".repeat(64);
  assert.equal(config.safeParse({version:1,workloads:[w]}).success,true);
  assert.equal(config.safeParse({version:1,workloads:[w,w]}).success,false);
});
