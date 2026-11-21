import { comparisonUploadSchema, maxComparisonBytes } from "@/lib/comparisons/schema.mjs";
import { publishComparisons } from "@/lib/comparisons/store";
import { authorizePilotUpload, unavailable } from "@/lib/measurements/http";

export async function POST(request: Request) {
  const authorizationError = authorizePilotUpload(request);
  if (authorizationError) return authorizationError;

  let json;
  try {
    if (!request.body) throw new Error("Request body is required.");
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxComparisonBytes) {
        void reader.cancel().catch(() => undefined);
        return Response.json({ error: "Comparison artifacts exceed the upload limit." }, { status: 413 });
      }
      chunks.push(value);
    }
    json = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, size)));
  } catch {
    return Response.json({ error: "The upload must be valid JSON." }, { status: 400 });
  }

  const result = comparisonUploadSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues.slice(0, 12).map(({ path, message }) => ({ path, message }));
    return Response.json({ error: "The comparison artifact is invalid.", issues }, { status: 422 });
  }
  try {
    const outcome = await publishComparisons(result.data);
    if (outcome.status === "conflict") {
      return Response.json({ error: "Different evidence already uses this publication or run identity." }, { status: 409 });
    }
    return Response.json({ comparisons: outcome.comparisons }, { status: outcome.status === "created" ? 201 : 200 });
  } catch (error) {
    return unavailable(error);
  }
}
