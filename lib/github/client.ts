import "server-only";

import { createSign } from "node:crypto";
import { z } from "zod";
import { githubSetting } from "./config";

const apiOrigin = "https://api.github.com";
const oauthEndpoint = "https://github.com/login/oauth/access_token";
export const githubId = z.string().regex(/^[1-9]\d{0,18}$/)
  .refine((id) => id.length < 19 || id <= "9223372036854775807");
export const providerId = z.number().int().positive().transform(String).pipe(githubId);
export const repositoryName = z.string().regex(/^[\w.-]+\/[\w.-]+$/);
export const repositorySchema = z.object({
  id: providerId,
  full_name: repositoryName,
  private: z.boolean(),
  default_branch: z.string().min(1),
});

export type GitHubRepository = z.output<typeof repositorySchema>;
export type InstalledRepository = GitHubRepository & { installationId: string };

const installationSchema = z.object({
  id: providerId,
  suspended_at: z.string().nullable().optional(),
  account: z.object({ login: z.string() }).nullable().optional(),
});
const identitySchema = z.object({
  id: providerId,
  login: z.string().min(1).max(100),
  name: z.string().max(250).nullable(),
  avatar_url: z.url({ protocol: /^https$/ }).nullable(),
});
const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().int().positive().optional(),
});

export class GitHubError extends Error {
  constructor(readonly status: number, readonly retryAt?: Date) {
    super(`GitHub returned HTTP ${status}`);
  }
}

function retryAt(response: Response) {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter && /^\d+$/.test(retryAfter)) return new Date(Date.now() + Number(retryAfter) * 1000);
  const reset = response.headers.get("x-ratelimit-reset");
  if (response.headers.get("x-ratelimit-remaining") === "0" && reset && /^\d+$/.test(reset)) {
    return new Date(Number(reset) * 1000);
  }
}

export async function githubRequest(path: string, token: string, init: RequestInit = {}) {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid GitHub API path");
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-GitHub-Api-Version", "2022-11-28");
  return fetch(`${apiOrigin}${path}`, {
    ...init, headers, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(8_000),
  });
}

export async function githubJson<Schema extends z.ZodType>(
  path: string, token: string, schema: Schema, init?: RequestInit,
): Promise<z.output<Schema>> {
  const response = await githubRequest(path, token, init);
  if (!response.ok) throw new GitHubError(response.status, retryAt(response));
  return schema.parse(await response.json());
}

export function githubIdentity(token: string) {
  return githubJson("/user", token, identitySchema);
}

export async function exchangeToken(parameters: Record<string, string>) {
  const body = new URLSearchParams({
    client_id: githubSetting("GITHUB_APP_CLIENT_ID"),
    client_secret: githubSetting("GITHUB_APP_CLIENT_SECRET"),
    ...parameters,
  });
  const response = await fetch(oauthEndpoint, {
    method: "POST",
    headers: { Accept: "application/json" },
    body,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new GitHubError(response.status, retryAt(response));
  const payload: unknown = await response.json();
  const error = z.object({ error: z.string() }).safeParse(payload);
  if (error.success) {
    const status = ["incorrect_client_credentials", "server_error"].includes(error.data.error) ? 503 : 401;
    throw new GitHubError(status);
  }
  return tokenSchema.parse(payload);
}

function appJwt() {
  const encode = (payload: object) => Buffer.from(JSON.stringify(payload)).toString("base64url");
  const now = Math.floor(Date.now() / 1_000);
  const claims = [
    encode({ alg: "RS256", typ: "JWT" }),
    encode({ iat: now - 60, exp: now + 8 * 60, iss: githubSetting("GITHUB_APP_CLIENT_ID") }),
  ].join(".");
  const key = githubSetting("GITHUB_APP_PRIVATE_KEY").replaceAll("\\n", "\n");
  const signature = createSign("RSA-SHA256").update(claims).sign(key, "base64url");
  return `${claims}.${signature}`;
}

export async function installationToken(installationId: string, repositoryId: string) {
  const id = githubId.parse(installationId);
  const repository = Number(githubId.parse(repositoryId));
  if (!Number.isSafeInteger(repository)) throw new Error("GitHub repository ID exceeds safe integer range");
  const result = await githubJson(
    `/app/installations/${id}/access_tokens`, appJwt(), z.object({ token: z.string() }), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repository_ids: [repository], permissions: { actions: "read" } }),
    },
  );
  return result.token;
}

export async function listInstallations(token: string) {
  const installations: z.output<typeof installationSchema>[] = [];
  for (let page = 1; ; page++) {
    const response = await githubJson(`/user/installations?per_page=100&page=${page}`, token,
      z.object({ installations: z.array(installationSchema) }));
    installations.push(...response.installations.filter((installation) => !installation.suspended_at));
    if (response.installations.length < 100) return installations;
  }
}

const repositoriesSchema = z.object({ repositories: z.array(repositorySchema) });

export async function listInstallationRepositories(token: string, installationId: string, page: number) {
  const id = githubId.parse(installationId);
  const response = await githubJson(
    `/user/installations/${id}/repositories?per_page=100&page=${page}`, token, repositoriesSchema,
  );
  return response.repositories;
}

export async function findInstalledRepository(token: string, installationId: string, repositoryId: string) {
  try {
    for (let page = 1; ; page++) {
      const repositories = await listInstallationRepositories(token, installationId, page);
      const repo = repositories.find(({ id }) => id === repositoryId);
      if (repo) return { ...repo, installationId };
      if (repositories.length < 100) return null;
    }
  } catch (error) {
    if (error instanceof GitHubError && [401, 404, 410].includes(error.status)) return null;
    throw error;
  }
}
