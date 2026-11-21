import { authorizePilotUpload, unavailable } from "@/lib/measurements/http";
import { pilotRepositoryId } from "@/lib/measurements/pilot.mjs";
import { recommendationEventSchema, recommendationSlug } from "@/lib/recommendations/schema.mjs";
import { recordRecommendationEvent } from "@/lib/recommendations/store";

export async function POST(request: Request, { params }: { params: Promise<{ repositoryId: string; slug: string }> }) {
  const { repositoryId, slug } = await params;
  if (repositoryId !== pilotRepositoryId || !recommendationSlug.safeParse(slug).success) {
    return Response.json({ error: "Recommendation not found." }, { status: 404 });
  }
  const auth = authorizePilotUpload(request);
  if (auth) return auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The event must be valid JSON." }, { status: 400 });
  }
  const event = recommendationEventSchema.safeParse(body);
  if (!event.success) {
    return Response.json({ error: "The recommendation event is invalid." }, { status: 422 });
  }

  try {
    const result = await recordRecommendationEvent(repositoryId, slug, event.data);
    if (result.status === "missing") return Response.json({ error: "Recommendation not found." }, { status: 404 });
    if (result.status === "conflict") return Response.json({ error: result.reason }, { status: 409 });
    return Response.json({ event: result.event }, { status: result.status === "created" ? 201 : 200 });
  } catch (error) {
    return unavailable(error);
  }
}
