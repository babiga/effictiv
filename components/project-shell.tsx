import Link from "next/link";
import { LeafIcon, LogOutIcon } from "lucide-react";
import type { Account } from "@/lib/github/accounts";
import { Button, buttonVariants } from "@/components/ui/button";

export function ProjectShell({ account, children }: { account: Account; children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-dashboard-background">
      <header className="border-b bg-card/50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-medium">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-400 text-primary-foreground">
              <LeafIcon className="size-4" aria-hidden />
            </span>
            Effictiv
          </Link>
          <nav aria-label="Dashboard navigation" className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/dashboard">Repositories</Link>
            <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/pilot">Public pilot</Link>
            <span title={`@${account.login}`} className="max-w-36 truncate text-sm text-muted-foreground">{account.name}</span>
            <form action="/api/auth/logout" method="post">
              <Button type="submit" variant="outline" size="sm"><LogOutIcon aria-hidden /> Log out</Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9">{children}</main>
    </div>
  );
}
