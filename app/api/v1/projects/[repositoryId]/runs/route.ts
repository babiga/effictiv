import { z } from "zod";
import { publicProjectExists } from "@/lib/measurements/database";
import { runsCsv, unavailable } from "@/lib/measurements/http";
import { scenarioKey } from "@/lib/measurements/schema.mjs";
import { listRuns } from "@/lib/measurements/store";
import type { RunPage } from "@/lib/measurements/types";

const repository = z.string().regex(/^[1-9]\d{0,18}$/).refine((id) => id.length < 19 || id <= "9223372036854775807");
const cursorSchema = z.strictObject({ startedAt: z.iso.datetime({ precision: 3 }), id: z.uuid() });
const querySchema = z.object({
  scenario: scenarioKey.optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(6),
  cursor: z.string().regex(/^[\w-]{1,160}$/).optional(),
  format: z.literal("csv").optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ repositoryId: string }> }) {
  const project = repository.safeParse((await params).repositoryId);
  if (!project.success) return Response.json({ error: "Project not found." }, { status: 404 });

  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return Response.json({ error: "Invalid run filters." }, { status: 400 });
  const { cursor, limit, format, ...filters } = query.data;
  let after;
  if (format === "csv" && cursor) {
    return Response.json({ error: "Export filters cannot include a page cursor." }, { status: 400 });
  }
  if (cursor) {
    try {
      after = cursorSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
    } catch {
      return Response.json({ error: "Invalid page cursor." }, { status: 400 });
    }
  }

  try {
    if (!await publicProjectExists(project.data)) {
      return Response.json({ error: "Project not found." }, { status: 404 });
    }
    const headers = { "Cache-Control": "no-store" };
    if (format === "csv") {
      const runs = await listRuns(project.data, filters);
      return new Response(runsCsv(runs), {
        headers: {
          ...headers,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="effictiv-${project.data}-runs.csv"`,
        },
      });
    }

    const rows = await listRuns(project.data, filters, after, limit + 1);
    const runs = rows.slice(0, limit);
    const last = rows.length > limit ? runs.at(-1) : undefined;
    const nextCursor = last
      ? Buffer.from(JSON.stringify({ startedAt: last.startedAt, id: last.id })).toString("base64url")
      : null;
    return Response.json({ runs, nextCursor } satisfies RunPage, { headers });
  } catch (error) {
    return unavailable(error);
  }
}
