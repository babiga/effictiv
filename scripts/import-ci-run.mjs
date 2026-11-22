import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { ecoCiArtifactSchema, ecoCiUploadSchema } from "../lib/measurements/eco-ci-schema.mjs";
import { pilotRepositoryId, pilotRepositoryName } from "../lib/measurements/pilot.mjs";

async function main() {
  const [filename, artifactUrl] = process.argv.slice(2);
  if (!filename || !artifactUrl) throw new Error("Usage: npm run import:ci-run -- <artifact.json> <https://artifact-url>");
  const token = process.env.EFFICTIV_PILOT_WRITE_TOKEN;
  if (!token) throw new Error("Set EFFICTIV_PILOT_WRITE_TOKEN for the target server");
  const endpoint = new URL("/api/v1/ci-runs", process.env.EFFICTIV_URL ?? "http://127.0.0.1:3000");
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname);
  if (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && loopback)) {
    throw new Error("The import endpoint must use HTTPS or loopback HTTP");
  }

  const bytes = await readFile(filename);
  const artifact = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  const parsed = ecoCiArtifactSchema.parse(artifact);
  if (parsed.repositoryId !== pilotRepositoryId || parsed.repository !== pilotRepositoryName) {
    throw new Error("This command only imports CI artifacts for the pilot repository");
  }
  const upload = ecoCiUploadSchema.parse({
    repositoryId: pilotRepositoryId, artifactUrl, artifact, artifactSha256: createHash("sha256").update(bytes).digest("hex"),
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
