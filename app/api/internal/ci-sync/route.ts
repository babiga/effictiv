import { createHash, timingSafeEqual } from "node:crypto";
import { processCiQueue } from "@/lib/ci/queue";
import { database } from "@/lib/measurements/database";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!secret || !timingSafeEqual(digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`))) {
    return new Response(null, { status: 401 });
  }
  await database().query("DELETE FROM account_sessions WHERE expires_at <= now()");
  await processCiQueue(undefined, 20);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
