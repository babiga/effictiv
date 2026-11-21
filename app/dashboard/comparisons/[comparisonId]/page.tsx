import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BenchmarkEvidence } from "@/components/live-benchmarks";
import { getComparison } from "@/lib/comparisons/store";
import { pilotRepositoryId } from "@/lib/measurements/pilot.mjs";

export const dynamic = "force-dynamic";

export default async function ComparisonPage({ params }: { params: Promise<{ comparisonId: string }> }) {
  const { comparisonId } = await params;
  if (!z.uuid().safeParse(comparisonId).success) notFound();
  const comparison = await getComparison(pilotRepositoryId, comparisonId);
  if (!comparison) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4 lg:p-6">
      <Link href="/dashboard" className="text-sm text-muted-foreground underline underline-offset-4">Back to dashboard</Link>
      <h1 className="text-xl tracking-tight">Dashboard benchmark comparison</h1>
      <BenchmarkEvidence comparison={comparison} />
    </main>
  );
}
