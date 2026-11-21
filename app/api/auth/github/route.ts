import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookieOptions, oauthCookie, randomToken } from "@/lib/github/accounts";
import { appOrigin, githubSetting, noStore } from "@/lib/github/config";

export function GET() {
  const origin = appOrigin();
  try {
    const url = new URL("https://github.com/login/oauth/authorize");
    const state = randomToken();
    const verifier = randomToken();
    url.search = new URLSearchParams({
      client_id: githubSetting("GITHUB_APP_CLIENT_ID"),
      redirect_uri: `${origin}/api/auth/github/callback`,
      state,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
    }).toString();
    const response = NextResponse.redirect(url, { headers: noStore });
    response.cookies.set(oauthCookie, `${state}.${verifier}`, cookieOptions(600));
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=unavailable", origin), { headers: noStore });
  }
}
