import { z } from "zod";
import { repositoryIdSchema } from "@/lib/comparisons/schema.mjs";
import { getComparison } from "@/lib/comparisons/store";
import { unavailable } from "@/lib/measurements/http";

export async function GET(_: Request, { params }: { params: Promise<{ repositoryId: string; comparisonId: string }> }) {
  const { repositoryId, comparisonId } = await params;
  try {
    const comparison = repositoryIdSchema.safeParse(repositoryId).success && z.uuid().safeParse(comparisonId).success
      ? await getComparison(repositoryId, comparisonId)
      : null;
    return comparison
      ? Response.json(comparison, { headers: { "Cache-Control": "no-store" } })
      : Response.json({ error: "Comparison not found." }, { status: 404 });
  } catch (error) {
    return unavailable(error);
  }
}
