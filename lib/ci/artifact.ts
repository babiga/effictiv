import "server-only";

import { createHash } from "node:crypto";
import { fromBufferPromise } from "yauzl";
import { z } from "zod";
import { githubJson, githubRequest, GitHubError, providerId } from "@/lib/github/client";
import { ecoCiArtifactSchema } from "@/lib/measurements/eco-ci-schema.mjs";
import { commitSha, workflowRunSchema } from "./workflow";

const maxJsonBytes = 256 * 1024;
const maxZipBytes = maxJsonBytes + 16 * 1024;
const jsonName = "effictiv-eco-ci.json";

const artifactsSchema = z.object({
  artifacts: z.array(z.object({
    id: providerId,
    name: z.string(),
    expired: z.boolean(),
    size_in_bytes: z.number().nonnegative(),
    digest: z.string().nullish(),
    workflow_run: z.object({
      id: providerId,
      repository_id: providerId,
      head_repository_id: providerId,
      head_sha: commitSha,
    }).nullish(),
  })),
});

export class InvalidArtifact extends Error {}
export class MissingArtifact extends Error {}

async function readBounded(chunks: AsyncIterable<Uint8Array>, limit: number) {
  const buffers: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of chunks) {
    bytes += chunk.byteLength;
    if (bytes > limit) throw new InvalidArtifact("The collector artifact exceeds the size limit.");
    buffers.push(Buffer.from(chunk));
  }
  return Buffer.concat(buffers, bytes);
}

async function* bodyChunks(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

async function downloadZip(path: string, token: string) {
  let response = await githubRequest(path, token);
  if (response.status === 302) {
    const location = response.headers.get("location");
    const url = location ? new URL(location) : null;
    if (!url || url.protocol !== "https:" || url.port || url.username || url.password
      || ![".blob.core.windows.net", ".actions.githubusercontent.com", ".githubusercontent.com"]
        .some((domain) => url.hostname.endsWith(domain))) {
      throw new InvalidArtifact("The artifact download host is unsupported.");
    }
    response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8_000) });
  }
  if (response.status === 404 || response.status === 410) throw new MissingArtifact("The artifact is unavailable.");
  if (!response.ok || !response.body) throw new GitHubError(response.status || 503);
  return readBounded(bodyChunks(response.body), maxZipBytes);
}

async function parseZip(bytes: Buffer) {
  try {
    const zip = await fromBufferPromise(bytes, { lazyEntries: true, strictFileNames: true, autoClose: false });
    try {
      if (zip.entryCount !== 1) throw new InvalidArtifact("Expected a single collector export.");
      for await (const entry of zip.eachEntry()) {
        if (entry.fileName !== jsonName || entry.uncompressedSize > maxJsonBytes) {
          throw new InvalidArtifact("The collector export has an unexpected name or size.");
        }
        const stream = await zip.openReadStreamPromise(entry);
        return await readBounded(stream, maxJsonBytes);
      }
      throw new InvalidArtifact("The collector export is missing from its archive.");
    } finally {
      zip.close();
    }
  } catch (error) {
    if (error instanceof InvalidArtifact) throw error;
    throw new InvalidArtifact("The collector artifact is not a readable ZIP archive.");
  }
}

type Run = z.output<typeof workflowRunSchema>;

export async function fetchCiArtifact(token: string, repository: string, repositoryId: string, run: Run) {
  const path = `/repos/${repository}/actions`;
  const name = `effictiv-eco-ci-${run.id}-${run.run_attempt}`;
  const candidates: z.output<typeof artifactsSchema>["artifacts"] = [];
  for (let page = 1; ; page++) {
    const { artifacts } = await githubJson(
      `${path}/runs/${run.id}/artifacts?per_page=100&page=${page}`, token, artifactsSchema,
    );
    candidates.push(...artifacts.filter((artifact) => artifact.name === name && !artifact.expired));
    if (artifacts.length < 100) break;
  }
  if (!candidates.length) throw new MissingArtifact("GitHub has no collector artifact for this attempt.");
  const [source] = candidates;
  if (candidates.length !== 1 || source.size_in_bytes > maxZipBytes || !/^sha256:[a-f0-9]{64}$/.test(source.digest ?? "")
    || source.workflow_run?.id !== run.id || source.workflow_run.repository_id !== repositoryId
    || source.workflow_run.head_repository_id !== repositoryId || source.workflow_run.head_sha !== run.head_sha) {
    throw new InvalidArtifact("GitHub artifact metadata does not match the requested run.");
  }

  const archive = await downloadZip(`${path}/artifacts/${source.id}/zip`, token);
  if (`sha256:${createHash("sha256").update(archive).digest("hex")}` !== source.digest) {
    throw new InvalidArtifact("The archive does not match GitHub’s SHA-256 digest.");
  }

  const bytes = await parseZip(archive);
  let rawArtifact: string;
  try {
    rawArtifact = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new InvalidArtifact("The collector export is not valid UTF-8.");
  }
  const parsed = ecoCiArtifactSchema.safeParse(rawArtifact);
  if (!parsed.success || parsed.data.repositoryId !== repositoryId
    || parsed.data.repository.toLowerCase() !== repository.toLowerCase()
    || parsed.data.runId !== run.id || parsed.data.attempt !== run.run_attempt
    || parsed.data.commitSha !== run.head_sha
    || (parsed.data.outcomes.build === "success") !== (run.conclusion === "success")) {
    throw new InvalidArtifact("The collector export does not match the verified GitHub run.");
  }

  return {
    artifact: parsed.data,
    source: {
      artifactUrl: `https://github.com/${repository}/actions/runs/${run.id}/artifacts/${source.id}`,
      artifactSha256: createHash("sha256").update(bytes).digest("hex"),
      githubArtifactId: source.id,
      rawArtifact,
    },
  };
}
