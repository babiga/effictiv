import { repositoryIdSchema, sha256Schema } from "@/lib/comparisons/schema.mjs";
import { getComparisonArtifact } from "@/lib/comparisons/store";
import { unavailable } from "@/lib/measurements/http";

export async function GET(_: Request, { params }: { params: Promise<{ repositoryId: string; digest: string }> }) {
  const { repositoryId, digest } = await params;
  try {
    const log = repositoryIdSchema.safeParse(repositoryId).success && sha256Schema.safeParse(digest).success
      ? await getComparisonArtifact(repositoryId, digest)
      : null;
    return log === null
      ? Response.json({ error: "Source log not found." }, { status: 404 })
      : new Response(log, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store",
        },
      });
  } catch (error) {
    return unavailable(error);
  }
}
