import { createHash, timingSafeEqual } from "node:crypto";
import { unavailable } from "@/lib/measurements/http";
import { uploadSchema } from "@/lib/measurements/schema.mjs";
import { insertRun } from "@/lib/measurements/store";

export async function POST(request: Request) {
  const token = process.env.EFFICTIV_PILOT_WRITE_TOKEN;
  if (!token) return unavailable(new Error("EFFICTIV_PILOT_WRITE_TOKEN is required"));
  const authorization = request.headers.get("authorization") ?? "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(authorization), digest(`Bearer ${token}`))) {
    return Response.json({ error: "A valid pilot upload credential is required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The upload must be valid JSON." }, { status: 400 });
  }
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(({ path, message }) => ({ path, message }));
    return Response.json({ error: "The benchmark result is invalid.", issues }, { status: 422 });
  }

  try {
    const outcome = await insertRun(parsed.data);
    if (outcome.status === "conflict") {
      return Response.json({ error: "A different result already uses this run identity." }, { status: 409 });
    }
    return Response.json({ id: outcome.id }, { status: outcome.status === "created" ? 201 : 200 });
  } catch (error) {
    return unavailable(error);
  }
}
