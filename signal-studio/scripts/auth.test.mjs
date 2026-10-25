import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
const dir = await fs.mkdtemp(path.join(os.tmpdir(), "signal-auth-"));
await fs.writeFile(path.join(dir, "package.json"), '{"type":"module"}');
const source = await fs.readFile(
  new URL("../lib/session.ts", import.meta.url),
  "utf8",
);
await fs.writeFile(
  path.join(dir, "session.js"),
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
);
const { signSession, verifySession, validPassword } = await import(
  path.join(dir, "session.js")
);
process.env.WORKSPACE_ID = "workspace-owner";
process.env.SESSION_SECRET = "unit-test-secret-with-more-than-32-characters";
process.env.WORKSPACE_PASSWORD = "unit-test-password-with-enough-length";
test("sessions reject tampering, expiration and a different workspace", () => {
  const token = signSession(1000000);
  assert.equal(verifySession(token, 1001000), "workspace-owner");
  assert.equal(verifySession(token + "x", 1001000), null);
  assert.equal(verifySession(token, 1000000 + 8 * 24 * 60 * 60 * 1000), null);
  process.env.WORKSPACE_ID = "other";
  assert.equal(verifySession(token, 1001000), null);
  delete process.env.WORKSPACE_ID;
});
test("password comparison rejects the wrong password", () => {
  assert.equal(validPassword("wrong"), false);
  assert.equal(validPassword(process.env.WORKSPACE_PASSWORD), true);
});
