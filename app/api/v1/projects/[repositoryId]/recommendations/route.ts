import { repositoryIdSchema } from "@/lib/comparisons/schema.mjs";
import { publicProjectExists } from "@/lib/measurements/database";
import { unavailable } from "@/lib/measurements/http";
import { listRecommendations } from "@/lib/recommendations/store";

export async function GET(_: Request, { params }: { params: Promise<{ repositoryId: string }> }) {
  const project = repositoryIdSchema.safeParse((await params).repositoryId);
  if (!project.success) return Response.json({ error: "Project not found." }, { status: 404 });

  try {
    if (!await publicProjectExists(project.data)) {
      return Response.json({ error: "Project not found." }, { status: 404 });
    }
    const recommendations = await listRecommendations(project.data);
    return Response.json({ recommendations }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return unavailable(error);
  }
}
