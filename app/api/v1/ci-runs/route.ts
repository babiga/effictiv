import { createHash } from "node:crypto";
import { insertCiRun } from "@/lib/measurements/ci-store";
import { ecoCiArtifactSchema, ecoCiUploadSchema } from "@/lib/measurements/eco-ci-schema.mjs";
import { authorizePilotUpload, unavailable } from "@/lib/measurements/http";
import { pilotRepositoryId, pilotRepositoryName } from "@/lib/measurements/pilot.mjs";

export async function POST(request: Request) {
  const authorizationError = authorizePilotUpload(request);
  if (authorizationError) return authorizationError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The upload must be valid JSON." }, { status: 400 });
  }

  const upload = ecoCiUploadSchema.safeParse(body);
  if (!upload.success) return Response.json({ error: "The CI upload is invalid." }, { status: 422 });
  const { artifact, artifactSha256, artifactUrl } = upload.data;
  if (createHash("sha256").update(artifact).digest("hex") !== artifactSha256) {
    return Response.json({ error: "The artifact does not match the supplied SHA-256." }, { status: 422 });
  }
  const parsed = ecoCiArtifactSchema.safeParse(artifact);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(({ path, message }) => ({ path, message }));
    return Response.json({ error: "The Eco CI artifact is invalid.", issues }, { status: 422 });
  }

  if (parsed.data.repositoryId !== pilotRepositoryId || parsed.data.repository !== pilotRepositoryName) {
    return Response.json({ error: "This endpoint only accepts CI artifacts for the pilot repository." }, { status: 422 });
  }

  try {
    const outcome = await insertCiRun(parsed.data, { artifactSha256, artifactUrl });
    if (outcome.status === "conflict") {
      return Response.json({ error: "A different artifact already uses this CI run identity." }, { status: 409 });
    }
    return Response.json({ id: outcome.id }, { status: outcome.status === "created" ? 201 : 200 });
  } catch (error) {
    return unavailable(error);
  }
}
