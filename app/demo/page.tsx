import Link from "next/link";
import { DemoDashboard } from "@/components/demo-dashboard";

export default function DemoPage() {
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-sm lg:px-6">
        <span>Demo dashboard · Sample data</span>
        <Link href="/login" className="underline underline-offset-4">Sign in to Effictiv</Link>
      </header>
      <DemoDashboard />
    </>
  );
}
