import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { cookieOptions, createSession, deleteSession, oauthCookie, sessionCookie, sessionSeconds } from "@/lib/github/accounts";
import { exchangeToken, githubIdentity } from "@/lib/github/client";
import { appOrigin, noStore } from "@/lib/github/config";

function redirect(path: string) {
  const response = NextResponse.redirect(new URL(path, appOrigin()), { status: 303, headers: noStore });
  response.cookies.set(oauthCookie, "", cookieOptions(0));
  return response;
}

export async function GET(request: NextRequest) {
  const [state, verifier] = (request.cookies.get(oauthCookie)?.value ?? "").split(".");
  const code = request.nextUrl.searchParams.get("code");
  const receivedState = request.nextUrl.searchParams.get("state");
  const nonce = /^[\w-]{43}$/;
  if (!state || !verifier || !receivedState || !code
    || ![state, verifier, receivedState].every((value) => nonce.test(value))
    || !timingSafeEqual(Buffer.from(state), Buffer.from(receivedState))) {
    return redirect("/login?error=authorization");
  }

  try {
    const token = await exchangeToken({
      code,
      code_verifier: verifier,
      redirect_uri: `${appOrigin()}/api/auth/github/callback`,
    });
    const identity = await githubIdentity(token.access_token);
    await deleteSession();
    const session = await createSession(identity, token);
    const response = redirect("/dashboard");
    response.cookies.set(sessionCookie, session, cookieOptions(sessionSeconds));
    return response;
  } catch (error) {
    console.error("GitHub sign-in failed", error instanceof Error ? error.name : "unknown error");
    return redirect("/login?error=authorization");
  }
}
