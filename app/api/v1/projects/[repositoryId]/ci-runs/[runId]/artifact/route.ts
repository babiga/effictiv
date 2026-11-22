import { z } from "zod";
import { githubId } from "@/lib/github/client";
import { noStore } from "@/lib/github/config";
import { currentProject } from "@/lib/github/projects";
import { storedCiArtifact } from "@/lib/measurements/ci-store";
import { unavailable } from "@/lib/measurements/http";

export async function GET(_request: Request, { params }: { params: Promise<{ repositoryId: string; runId: string }> }) {
  const input = z.object({ repositoryId: githubId, runId: z.uuid() }).safeParse(await params);
  if (!input.success) return new Response(null, { status: 404, headers: noStore });
  const { repositoryId, runId } = input.data;
  try {
    if (!await currentProject(repositoryId)) return new Response(null, { status: 404, headers: noStore });
    const artifact = await storedCiArtifact(repositoryId, runId);
    if (artifact === null) return new Response(null, { status: 404, headers: noStore });
    return new Response(artifact, { headers: {
      ...noStore,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="effictiv-eco-ci.json"',
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    return unavailable(error);
  }
}
