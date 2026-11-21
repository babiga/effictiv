import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { availableParallelism, cpus } from "node:os";

async function collectorFile(name) {
  try {
    const contents = await readFile(`/tmp/eco-ci/${name}`, "utf8");
    return contents.trim() ? contents : null;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return null;
  }
}

const [destination] = process.argv.slice(2);
if (!destination) throw new Error("Usage: node scripts/capture-eco-ci.mjs <artifact.json>");

const [lapData, totalSamplesJoules, timer] = await Promise.all([
  collectorFile("lap-data.json"),
  collectorFile("energy-total.txt"),
  collectorFile("timer-total.txt"),
]);
const finishedAt = new Date().toISOString();
const startedAt = timer && /^\d{16}$/.test(timer.trim())
  ? new Date(Math.floor(Number(timer.trim()) / 1000)).toISOString()
  : null;

const artifact = {
  schemaVersion: 1,
  repositoryId: process.env.GITHUB_REPOSITORY_ID,
  repository: process.env.GITHUB_REPOSITORY,
  commitSha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  runId: process.env.GITHUB_RUN_ID,
  attempt: Number(process.env.GITHUB_RUN_ATTEMPT),
  job: process.env.GITHUB_JOB,
  jobId: process.env.ECO_CI_JOB_ID || null,
  runner: {
    image: "ubuntu-24.04",
    imageVersion: process.env.ImageVersion ?? null,
    architecture: process.arch,
    cpuModel: cpus()[0]?.model ?? null,
    logicalCpus: availableParallelism(),
  },
  collector: {
    version: "5.3.0",
    commit: "782dd4a31bc426a6ae26a7b08d89af454b10ffc0",
    model: "github_EPYC_7763_4_CPU_shared.sh",
  },
  startedAt,
  finishedAt,
  outcomes: { install: process.env.ECO_CI_INSTALL_OUTCOME, build: process.env.ECO_CI_BUILD_OUTCOME },
  lapData,
  totalSamplesJoules,
};

await writeFile(destination, `${JSON.stringify(artifact, null, 2)}\n`);
