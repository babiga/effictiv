import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { githubId } from "@/lib/github/client";
import { noStore } from "@/lib/github/config";
import { currentProject } from "@/lib/github/projects";
import { workflowFile } from "@/lib/ci/workflow";

const captureFile = "capture-eco-ci.mjs";

export async function GET(_request: Request, { params }: { params: Promise<{ repositoryId: string; file: string }> }) {
  const { repositoryId, file } = await params;
  if (!githubId.safeParse(repositoryId).success || ![workflowFile, captureFile].includes(file)
    || !await currentProject(repositoryId)) return new Response(null, { status: 404, headers: noStore });
  const path = file === workflowFile
    ? join(process.cwd(), "lib/ci/setup/effictiv-energy.yml")
    : join(process.cwd(), "scripts/capture-eco-ci.mjs");
  const contents = await readFile(path, "utf8");
  return new Response(contents, { headers: {
    ...noStore,
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Disposition": `attachment; filename="${file}"`,
    "X-Content-Type-Options": "nosniff",
  } });
}
