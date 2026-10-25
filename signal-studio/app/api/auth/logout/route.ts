import { NextResponse } from "next/server";
import { allowedOrigin } from "@/lib/auth";
import { COOKIE_NAME } from "@/lib/session";
export async function POST(request: Request) {
  if (!allowedOrigin(request))
    return NextResponse.json(
      { error: "Cross-origin request rejected" },
      { status: 403 },
    );
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.delete(COOKIE_NAME);
  return response;
}
