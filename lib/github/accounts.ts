import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { database } from "@/lib/measurements/database";
import { exchangeToken, githubIdentity, GitHubError } from "./client";
import { appOrigin, githubSetting } from "./config";

export const sessionCookie = "effictiv_session";
export const oauthCookie = "effictiv_github_oauth";
export const sessionSeconds = 30 * 24 * 60 * 60;

export function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: appOrigin().startsWith("https:"), sameSite: "lax" as const, path: "/", maxAge };
}

export function randomToken() {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function encryptionKey() {
  const key = Buffer.from(githubSetting("EFFICTIV_TOKEN_KEY"), "base64");
  if (key.length !== 32) throw new Error("EFFICTIV_TOKEN_KEY must contain 32 base64-encoded bytes");
  return key;
}

function encrypt(value: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString("base64url");
}

function decrypt(value: string) {
  const encoded = Buffer.from(value, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), encoded.subarray(0, 12));
  decipher.setAuthTag(encoded.subarray(12, 28));
  return Buffer.concat([decipher.update(encoded.subarray(28)), decipher.final()]).toString("utf8");
}

function encryptedTokenValues(token: Awaited<ReturnType<typeof exchangeToken>>) {
  return [
    encrypt(token.access_token),
    token.refresh_token ? encrypt(token.refresh_token) : null,
    token.expires_in === undefined ? null : new Date(Date.now() + token.expires_in * 1_000),
  ];
}

export async function createSession(identity: Awaited<ReturnType<typeof githubIdentity>>, token: Awaited<ReturnType<typeof exchangeToken>>) {
  const session = randomToken();
  const db = database();
  await db.query(`
    WITH account AS (
      INSERT INTO accounts (github_id, login, name, avatar_url, github_access_token, github_refresh_token, github_token_expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (github_id) DO UPDATE SET login = EXCLUDED.login, name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url, github_access_token = EXCLUDED.github_access_token,
        github_refresh_token = EXCLUDED.github_refresh_token, github_token_expires_at = EXCLUDED.github_token_expires_at
      RETURNING id
    )
    INSERT INTO account_sessions (account_id, token_hash, expires_at)
    SELECT id, $8, now() + ($9 * interval '1 second') FROM account
  `, [identity.id, identity.login, identity.name?.trim() || identity.login, identity.avatar_url,
    ...encryptedTokenValues(token), hashToken(session), sessionSeconds]);
  return session;
}

export type Account = { id: string; login: string; name: string; avatar: string | null };

export async function currentAccount() {
  const session = (await cookies()).get(sessionCookie)?.value;
  if (!session || !/^[\w-]{43}$/.test(session)) return null;
  const { rows } = await database().query<Account>(`
    SELECT a.id, a.login, a.name, a.avatar_url AS avatar
    FROM account_sessions s JOIN accounts a ON a.id = s.account_id
    WHERE s.token_hash = $1 AND s.expires_at > now()
  `, [hashToken(session)]);
  return rows[0] ?? null;
}

export async function deleteSession() {
  const session = (await cookies()).get(sessionCookie)?.value;
  if (session && /^[\w-]{43}$/.test(session)) {
    await database().query("DELETE FROM account_sessions WHERE token_hash = $1", [hashToken(session)]);
  }
}

type EncryptedCredentials = { access: string; refresh: string | null; expires: Date | null };

const credentialsSql = `
  SELECT github_access_token AS access, github_refresh_token AS refresh, github_token_expires_at AS expires
  FROM accounts WHERE id = $1
`;

function needsRefresh(credentials: EncryptedCredentials) {
  return credentials.expires && credentials.expires.getTime() <= Date.now() + 60_000;
}

export async function accountGitHubToken(accountId: string) {
  const db = database();
  const { rows: [credentials] } = await db.query<EncryptedCredentials>(credentialsSql, [accountId]);
  if (!credentials) throw new GitHubError(401);
  if (!needsRefresh(credentials)) return decrypt(credentials.access);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows: [locked] } = await client.query<EncryptedCredentials>(`${credentialsSql} FOR UPDATE`, [accountId]);
    if (!locked) throw new GitHubError(401);
    if (!needsRefresh(locked)) {
      await client.query("COMMIT");
      return decrypt(locked.access);
    }
    if (!locked.refresh) throw new GitHubError(401);

    const refreshed = await exchangeToken({ grant_type: "refresh_token", refresh_token: decrypt(locked.refresh) });
    await client.query(`
      UPDATE accounts SET github_access_token = $2, github_refresh_token = $3, github_token_expires_at = $4 WHERE id = $1
    `, [accountId, ...encryptedTokenValues(refreshed)]);
    await client.query("COMMIT");
    return refreshed.access_token;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
