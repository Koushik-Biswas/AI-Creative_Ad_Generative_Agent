import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "./session";
export async function getUserId() {
  return verifySession((await cookies()).get(COOKIE_NAME)?.value);
}
export function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return (
      new URL(origin).host ===
      (request.headers.get("host") || new URL(request.url).host)
    );
  } catch {
    return false;
  }
}
export function backendConfig() {
  const origin = process.env.PYTHON_API_URL || "";
  const token = process.env.PYTHON_SERVICE_TOKEN || "";
  if (!origin || token.length < 32)
    throw new Error(
      "Configure PYTHON_API_URL and PYTHON_SERVICE_TOKEN. See DEPLOYMENT.md.",
    );
  const url = new URL(origin);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(url.hostname)
    )
  )
    throw new Error("The Python service must use HTTPS outside localhost.");
  return { origin: url.origin, token };
}
