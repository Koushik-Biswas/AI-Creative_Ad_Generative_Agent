import { getUserId, allowedOrigin, backendConfig } from "./auth";
const error = (message: string, status: number) =>
  Response.json({ error: message }, { status });
export async function proxy(request: Request) {
  const path = new URL(request.url).pathname;
  const health = path === "/api/health";
  const user = health ? null : await getUserId();
  if (!health && !user) return error("Sign in to your workspace.", 401);
  if (request.method !== "GET" && !allowedOrigin(request))
    return error("Cross-origin request rejected.", 403);
  try {
    const { origin, token } = backendConfig();
    const incoming = new URL(request.url);
    if (
      incoming.pathname.includes("..") ||
      !incoming.pathname.startsWith("/api/")
    )
      return error("Invalid API path", 400);
    // Keep uploads below Vercel's request limit. Larger local deployments can use direct API uploads.
    if (Number(request.headers.get("content-length") || 0) > 4 * 1024 * 1024)
      return error("Use a file smaller than 4 MB through this gateway.", 413);
    const body = ["GET", "HEAD"].includes(request.method)
      ? undefined
      : await request.arrayBuffer();
    if (body && body.byteLength > 4 * 1024 * 1024)
      return error("Request exceeds 4 MB.", 413);
    const response = await fetch(
      new URL(incoming.pathname + incoming.search, origin),
      {
        method: request.method,
        headers: {
          "Content-Type":
            request.headers.get("content-type") || "application/json",
          "X-Service-Token": token,
          "X-User-Id": user || "",
        },
        body,
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(220000),
      },
    );
    const headers = new Headers({
      "Content-Type":
        response.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    const disposition = response.headers.get("content-disposition");
    if (disposition) headers.set("Content-Disposition", disposition);
    if (path.startsWith("/api/assets/"))
      headers.set("Content-Security-Policy", "default-src 'none'");
    return new Response(response.body, { status: response.status, headers });
  } catch (e) {
    return error(
      e instanceof Error && e.message.startsWith("Configure ")
        ? e.message
        : "The Python service is unavailable or timed out. Check its deployment and shared service token.",
      503,
    );
  }
}
