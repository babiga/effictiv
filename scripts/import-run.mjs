import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pilotRepositoryId } from "../lib/measurements/pilot.mjs";
import { resultSchema, uploadSchema } from "../lib/measurements/schema.mjs";

async function main() {
  const [filename, artifactUrl, attempt = "1", repetition = "1"] = process.argv.slice(2);
  if (!filename || !artifactUrl) {
    throw new Error("Usage: npm run import:run -- <result.json> <https://raw-log-url> [attempt] [repetition]");
  }
  const token = process.env.EFFICTIV_PILOT_WRITE_TOKEN;
  if (!token) throw new Error("Set EFFICTIV_PILOT_WRITE_TOKEN for the target server");
  const endpoint = new URL("/api/v1/runs", process.env.EFFICTIV_URL ?? "http://127.0.0.1:3000");
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname);
  if (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && loopback)) {
    throw new Error("The import endpoint must use HTTPS or loopback HTTP");
  }

  const result = resultSchema.parse(JSON.parse(await readFile(filename, "utf8")));
  const log = await readFile(join(dirname(filename), result.sourceLog.name));
  const digest = createHash("sha256").update(log).digest("hex");
  if (digest !== result.sourceLog.sha256) throw new Error("The collector log does not match the result digest");

  const upload = uploadSchema.parse({
    repositoryId: pilotRepositoryId, artifactUrl, attempt: Number(attempt), repetition: Number(repetition), result,
  });
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(upload),
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Upload returned ${response.status}\n${await response.text()}`);
  const { id } = await response.json();
  console.log(`${response.status === 201 ? "Imported" : "Already imported"} ${id}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
