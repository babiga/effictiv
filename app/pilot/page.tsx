import Link from "next/link";
import { PilotTabs } from "@/components/pilot-tabs";

export default function PilotPage() {
  return (
    <main className="min-h-svh bg-dashboard-background">
      <header className="border-b bg-card/50 px-4 py-5 lg:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-medium">Effictiv measurement pilot</h1>
            <p className="text-sm text-muted-foreground">Public measurements for babiga/effictiv</p>
          </div>
          <nav aria-label="Explore Effictiv" className="flex gap-5 text-sm">
            <Link className="underline underline-offset-4" href="/demo">Explore demo</Link>
            <Link className="underline underline-offset-4" href="/login">Sign in</Link>
          </nav>
        </div>
      </header>
      <PilotTabs />
    </main>
  );
}
