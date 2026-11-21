import { authorizePilotUpload, unavailable } from "@/lib/measurements/http";
import { uploadSchema } from "@/lib/measurements/schema.mjs";
import { insertRun } from "@/lib/measurements/store";

export async function POST(request: Request) {
  const authorizationError = authorizePilotUpload(request);
  if (authorizationError) return authorizationError;

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
