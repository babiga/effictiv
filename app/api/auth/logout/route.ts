import { NextResponse } from "next/server";
import { cookieOptions, deleteSession, sessionCookie } from "@/lib/github/accounts";
import { appOrigin, noStore, sameOrigin } from "@/lib/github/config";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403, headers: noStore });
  await deleteSession();
  const response = NextResponse.redirect(new URL("/login", appOrigin()), { status: 303, headers: noStore });
  response.cookies.set(sessionCookie, "", cookieOptions(0));
  return response;
}
