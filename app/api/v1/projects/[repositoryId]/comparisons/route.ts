import { z } from "zod";
import { repositoryIdSchema } from "@/lib/comparisons/schema.mjs";
import { listComparisons } from "@/lib/comparisons/store";
import { publicProjectExists } from "@/lib/measurements/database";
import { unavailable } from "@/lib/measurements/http";

const filters = z.object({ cursor: z.uuid().optional(), limit: z.coerce.number().int().min(1).max(50).default(12) });

export async function GET(request: Request, { params }: { params: Promise<{ repositoryId: string }> }) {
  const project = repositoryIdSchema.safeParse((await params).repositoryId);
  if (!project.success) return Response.json({ error: "Project not found." }, { status: 404 });

  const query = filters.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return Response.json({ error: "Invalid comparison filters." }, { status: 400 });

  try {
    if (!await publicProjectExists(project.data)) {
      return Response.json({ error: "Project not found." }, { status: 404 });
    }
    const { cursor, limit } = query.data;
    const rows = await listComparisons(project.data, cursor ?? null, limit + 1);
    const comparisons = rows.slice(0, limit);
    const nextCursor = rows.length > limit ? (comparisons.at(-1)?.id ?? null) : null;
    return Response.json({ comparisons, nextCursor }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return unavailable(error);
  }
}
