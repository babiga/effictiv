import {readFileSync, writeFileSync, appendFileSync, existsSync} from "node:fs";
import {execFileSync, spawnSync} from "node:child_process";
import {resolve, join} from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {cpus, release} from "node:os";
import {parse} from "yaml";
import {config, evaluate, metricUnits, reportSchema} from "./model.mjs";
import {inventory,largestChanges} from "./inventory.mjs";

const here = fileURLToPath(new URL(".",import.meta.url));
const [headPath,basePath,output] = process.argv.slice(2);
if (!headPath || !basePath || !output) throw new Error("Usage: node run.mjs HEAD_DIR BASE_DIR|- OUTPUT.json");
const head = resolve(headPath), base = basePath === "-" ? null : resolve(basePath);
const revision = cwd => execFileSync("git",["rev-parse","HEAD"],{cwd,encoding:"utf8"}).trim();
const env = process.env;
const headSizes=new Map(),baseSizes=new Map();
const report = {version:1,repositoryId:env.GITHUB_REPOSITORY_ID,runId:env.GITHUB_RUN_ID,attempt:Number(env.GITHUB_RUN_ATTEMPT),
  workflowSha:env.EFFICTIV_WORKFLOW_SHA ?? revision(head), commitSha:revision(head),baseSha:base ? revision(base) : null,
  configHash:null,setupError:null,runner:`Linux ${release()} / ${process.arch} / ${cpus()[0]?.model ?? "unknown CPU"}`,
  inventory:inventory(head,headSizes),baselineInventory:base ? inventory(base,baseSizes) : null,
  changes:base ? largestChanges(baseSizes,headSizes) : [],workloads:[]};

function readSample(dir,s,audit=false) {
  const proc = spawnSync("python3",[join(here,"sample.py")],{cwd:dir,input:JSON.stringify({scenario:s,audit}),encoding:"utf8",
    timeout:150000,maxBuffer:4*1024*1024});
  if (proc.status !== 0) {
    console.error(proc.stderr?.slice(-2000));
    throw new Error("Workload start, completion, or output assertion failed. See Actions logs.");
  }
  return JSON.parse(proc.stdout);
}
function measure(dir,s,record) {
  const result = readSample(dir,s).sample;
  if (s.gmt && env.GMT_DIR) {
    const response = spawnSync("python3",[join(here,"gmt.py")],{cwd:dir,input:JSON.stringify(s),encoding:"utf8",timeout:320000});
    if (response.status !== 0) throw new Error("GMT energy capture failed or its output assertion did not match.");
    const reading = JSON.parse(response.stdout);
    const boundary = "Green Metrics Tool 4.2 • host CPU "+reading.domains.join(", ");
    if (record.energySource && record.energySource !== boundary) throw new Error("Energy measurement boundary changed.");
    record.energySource = boundary;
    result.energyWh = reading.wh;
  }
  return result;
}
function benchmark(s) {
  const {id,kind,metric,budget,unit,per,maxP95Ms}=s;
  const record = {target:{id,kind,metric,budget,unit,per,maxP95Ms},subject:s.url ? new URL(s.url).pathname.slice(0,1024) : id,error:null,calibration:[],base:[],head:[],
    baseDelivery:null,headDelivery:null,energySource:null};
  try {
    for(const dir of [base,head].filter(Boolean)){
      if (s.setup) execFileSync("bash",["-ec",s.setup],{cwd:dir,stdio:"inherit",timeout:600000});
    }
    if (base) {
      for (const file of [...s.fixtures,...(s.gmt ? [s.gmt.file] : [])]) {
        if (!readFileSync(join(base,file)).equals(readFileSync(join(head,file)))) {
          throw new Error("The declared fixture or GMT scenario changed between commits.");
        }
      }
    }
    if (kind === "page") {
      record.headDelivery = readSample(head,s,true).delivery;
      if (base) record.baseDelivery = readSample(base,s,true).delivery;
    }
    if (!base) record.head.push(measure(head,s,record));
    else {
      for(let pair=0;pair<6;pair++) {
        record.calibration.push(measure(base,s,record),measure(base,s,record));
        for(const side of (pair%2 ? ["head","base"] : ["base","head"])) {
          record[side].push(measure(side==="head"?head:base,s,record));
        }
      }
    }
  } catch(error) {
    console.error(id, error.message);
    record.error = error.message.startsWith("Command failed") ? "Workload setup failed. See Actions logs." : error.message.slice(0,300);
  }
  return record;
}

const path = join(head,".effictiv.yml");
if(existsSync(path)) {
  try {
    const contents = readFileSync(path,"utf8");
    report.configHash = createHash("sha256").update(contents).digest("hex");
    const parsed = config.parse(parse(contents));
    report.workloads = parsed.workloads.map(benchmark);
  } catch(error) {
    console.error(error.message);
    report.setupError = "Invalid .effictiv.yml configuration. See Actions logs.";
  }
}
const checked = reportSchema.parse(report);
writeFileSync(output, JSON.stringify(checked));
if(env.GITHUB_STEP_SUMMARY) {
  const rows = checked.workloads.map(w=>{
    const x=evaluate(w);
    return `| ${w.target.id} | ${x.score ?? "—"} | ${x.before?.toPrecision(4) ?? "—"} → ${x.after?.toPrecision(4) ?? "—"} ${metricUnits[w.target.metric]} | ${x.verdict} |`;
  });
  const compare=checked.baseSha ? `https://github.com/${env.GITHUB_REPOSITORY}/compare/${checked.baseSha}...${checked.commitSha}` : null;
  const link=`https://github.com/${env.GITHUB_REPOSITORY}/actions/runs/${checked.runId}`;
  appendFileSync(env.GITHUB_STEP_SUMMARY,["## Effictiv efficiency report", "",`${checked.inventory.files} tracked files · ${checked.inventory.bytes} repository bytes.`,
    "", "| Workload | Target score | Base → head | Verdict |","|---|---:|---|---|",...rows,"",
    checked.setupError ?? "", compare ? `[Compare commits](${compare}) · ` : "",`[Run evidence](${link})`, ""].join("\n"));
}
