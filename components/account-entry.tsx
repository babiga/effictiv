import Link from "next/link";
import { GitBranchIcon, LeafIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { productGoal } from "@/lib/product";

const errors: Record<string, string> = {
  unavailable: "GitHub sign-in is temporarily unavailable.",
  authorization: "GitHub sign-in couldn’t be completed. Try again.",
  connection: "Sign in again to reconnect to GitHub.",
};

export function AccountEntry({ register, error }: { register?: boolean; error?: string }) {
  return (
    <main className="grid min-h-svh place-items-center bg-dashboard-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-emerald-400 text-primary-foreground">
            <LeafIcon className="size-5" aria-hidden />
          </span>
          <span className="text-xl font-medium">Effictiv</span>
        </div>
        <p className="text-sm text-muted-foreground">{productGoal}</p>
        <Card>
          <CardHeader>
            <CardTitle><h1 className="text-xl">{register ? "Create an account" : "Sign in to Effictiv"}</h1></CardTitle>
            <CardDescription className="text-base">
              {register ? "Use GitHub to create your Effictiv account and import repositories."
                : "Use your GitHub account to access your repositories and CI measurements."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && Object.hasOwn(errors, error) && <p role="alert" className="text-sm text-destructive">{errors[error]}</p>}
            <a href="/api/auth/github" className={buttonVariants({ className: "w-full", size: "lg" })}>
              <GitBranchIcon aria-hidden /> Continue with GitHub
            </a>
            <p className="text-sm text-muted-foreground">
              {register ? "Already have an account? " : "New to Effictiv? "}
              <Link className="text-foreground underline underline-offset-4" href={register ? "/login" : "/register"}>
                {register ? "Sign in" : "Create an account"}
              </Link>
            </p>
          </CardContent>
        </Card>
        <nav aria-label="Explore Effictiv" className="flex flex-wrap gap-5 text-sm text-muted-foreground">
          <Link className="underline underline-offset-4" href="/pilot">Public measurement pilot</Link>
          <Link className="underline underline-offset-4" href="/demo">Explore demo</Link>
        </nav>
      </div>
    </main>
  );
}
