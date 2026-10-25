import { createHash, createHmac, timingSafeEqual } from "node:crypto";
export const COOKIE_NAME = "signal_session";
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
function secret() {
  const value = process.env.SESSION_SECRET || "";
  if (value.length < 32)
    throw new Error(
      "Configure SESSION_SECRET with at least 32 random characters.",
    );
  return value;
}
export function ownerId() {
  return process.env.WORKSPACE_ID || "workspace-owner";
}
export function validPassword(value: string) {
  const expected = process.env.WORKSPACE_PASSWORD || "";
  if (expected.length < 12)
    throw new Error(
      "Configure WORKSPACE_PASSWORD with at least 12 characters.",
    );
  return timingSafeEqual(
    createHash("sha256").update(value).digest(),
    createHash("sha256").update(expected).digest(),
  );
}
export function signSession(at = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: ownerId(),
      exp: Math.floor(at / 1000) + SESSION_SECONDS,
    }),
  ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", secret()).update(payload).digest("base64url")
  );
}
export function verifySession(
  value: string | undefined,
  at = Date.now(),
): string | null {
  if (!value || value.length > 2000) return null;
  try {
    const [payload, signature, extra] = value.split(".");
    if (!payload || !signature || extra) return null;
    const supplied = Buffer.from(signature, "base64url");
    const expected = createHmac("sha256", secret()).update(payload).digest();
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    )
      return null;
    const content = JSON.parse(Buffer.from(payload, "base64url").toString());
    return content.sub === ownerId() &&
      Number.isInteger(content.exp) &&
      content.exp > Math.floor(at / 1000)
      ? content.sub
      : null;
  } catch {
    return null;
  }
}
