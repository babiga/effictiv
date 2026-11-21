import "server-only";

export function githubSetting(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function appOrigin() {
  const address = process.env.EFFICTIV_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return new URL(address).origin;
}

export function sameOrigin(request: Request) {
  return request.headers.get("origin") === appOrigin();
}

export const noStore = { "Cache-Control": "private, no-store" };
