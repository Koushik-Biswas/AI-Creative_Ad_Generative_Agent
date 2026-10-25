import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { allowedOrigin, backendConfig } from "@/lib/auth";
import {
  COOKIE_NAME,
  SESSION_SECONDS,
  ownerId,
  signSession,
  validPassword,
} from "@/lib/session";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!allowedOrigin(request))
    return NextResponse.json(
      { error: "Cross-origin request rejected." },
      { status: 403 },
    );
  try {
    const text = await request.text();
    if (text.length > 2000)
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    const { password } = JSON.parse(text);
    if (typeof password !== "string" || password.length > 256)
      return NextResponse.json(
        { error: "Enter your workspace password." },
        { status: 400 },
      );
    const { origin, token } = backendConfig();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const fingerprint = createHash("sha256").update(ip).digest("hex");
    const guard = await fetch(new URL("/api/auth/attempt", origin), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Token": token,
        "X-User-Id": ownerId(),
      },
      body: JSON.stringify({ fingerprint }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!guard.ok)
      return NextResponse.json(
        {
          error:
            guard.status === 429
              ? "Too many sign-in attempts. Wait 15 minutes."
              : "The Python service is not ready. Verify the backend URL and service token.",
        },
        { status: guard.status === 429 ? 429 : 503 },
      );
    if (!validPassword(password))
      return NextResponse.json(
        { error: "Incorrect workspace password." },
        { status: 401 },
      );
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, signSession(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return response;
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.message.startsWith("Configure ")
            ? e.message
            : "Sign-in could not complete. Check your environment settings and Python service.",
      },
      { status: 503 },
    );
  }
}
