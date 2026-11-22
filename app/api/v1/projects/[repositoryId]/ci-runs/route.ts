import { currentProject } from "@/lib/github/projects";
import { z } from "zod";
import { listCiRuns } from "@/lib/measurements/ci-store";
import type { CiRunPage } from "@/lib/measurements/ci-types";
import { publicProjectExists } from "@/lib/measurements/database";
import { measurementsCsv, unavailable } from "@/lib/measurements/http";

const repository = z.string().regex(/^[1-9]\d{0,18}$/).refine((id) => id.length < 19 || id <= "9223372036854775807");
const cursorSchema = z.strictObject({ finishedAt: z.iso.datetime({ precision: 3 }), id: z.uuid() });
const querySchema = z.object({
  search: z.string().trim().regex(/^[a-f0-9]{1,40}$/i).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(6),
  cursor: z.string().regex(/^[\w-]{1,160}$/).optional(),
  format: z.literal("csv").optional(),
  scope: z.enum(["pilot", "project"]).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ repositoryId: string }> }) {
  const project = repository.safeParse((await params).repositoryId);
  if (!project.success) return Response.json({ error: "Project not found." }, { status: 404 });
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return Response.json({ error: "Invalid CI run filters." }, { status: 400 });

  const { search, limit, cursor, format, scope } = query.data;
  if (format === "csv" && cursor) return Response.json({ error: "Export filters cannot include a page cursor." }, { status: 400 });
  let after;
  if (cursor) {
    try {
      after = cursorSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
    } catch {
      return Response.json({ error: "Invalid page cursor." }, { status: 400 });
    }
  }

  try {
    const headers = { "Cache-Control": "private, no-store" };
    const isPublic = scope !== "project" && await publicProjectExists(project.data);
    const readScope = scope ?? (isPublic ? "pilot" : "project");
    const allowed = readScope === "project" ? await currentProject(project.data) : isPublic;
    if (!allowed) return Response.json({ error: "Project not found." }, { status: 404, headers });
    const rows = await listCiRuns(project.data, search, after, format === "csv" ? undefined : limit + 1, readScope);
    if (format === "csv") {
      const columns = [
        "CI run ID", "GitHub workflow run ID", "Attempt", "Job", "GitHub job ID", "Commit",
        "Started at (UTC)", "Finished at (UTC)", "Build outcome", "Runner image", "Image version", "Architecture",
        "Runner CPU", "Logical CPUs", "Eco CI version", "Eco CI commit", "Model preset", "Modeled job energy (J)",
        "Modeled job energy (Wh)", "Modeled energy per successful build (Wh/build)", "Phases", "Boundary",
        "Energy status reason", "Source artifact", "Source SHA-256",
      ];
      const values = rows.map((run) => [
        run.id, run.runId, run.attempt, run.job, run.jobId, run.commitSha, run.startedAt, run.finishedAt, run.buildOutcome,
        run.runner.image, run.runner.imageVersion, run.runner.architecture, run.runner.cpuModel, run.runner.logicalCpus,
        run.collector.version, run.collector.commit, run.collector.model, run.jobJoules, run.jobWh, run.buildWh,
        JSON.stringify(run.phases), run.boundary, run.energyUnavailableReason, run.artifactUrl, run.artifactSha256,
      ]);
      return new Response(measurementsCsv(columns, values), { headers: {
        ...headers,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="effictiv-${project.data}-ci-runs.csv"`,
      } });
    }

    const runs = rows.slice(0, limit);
    const last = rows.length > limit ? runs.at(-1) : undefined;
    const nextCursor = last
      ? Buffer.from(JSON.stringify({ finishedAt: last.finishedAt, id: last.id })).toString("base64url")
      : null;
    return Response.json({ runs, nextCursor } satisfies CiRunPage, { headers });
  } catch (error) {
    return unavailable(error);
  }
}
