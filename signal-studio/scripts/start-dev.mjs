import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHmac } from "node:crypto";
import { spawn } from "node:child_process";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (
  (process.env.SESSION_SECRET || "").length < 32 ||
  (process.env.WORKSPACE_PASSWORD || "").length < 12
) {
  console.error("Run npm run setup, then configure .env.local.");
  process.exit(1);
}
const token =
  process.env.PYTHON_SERVICE_TOKEN ||
  createHmac("sha256", process.env.SESSION_SECRET)
    .update("signal-studio-service")
    .digest("hex");
const env = {
  ...process.env,
  SERVICE_TOKEN: token,
  PYTHON_SERVICE_TOKEN: token,
  PYTHON_API_URL: "http://127.0.0.1:8000",
  DEV_AUTH: "0",
  DATA_DIR: resolve("data"),
};
const localPython =
  process.platform === "win32"
    ? resolve(".venv/Scripts/python.exe")
    : resolve(".venv/bin/python");
const python =
  process.env.PYTHON_BIN || (existsSync(localPython) ? localPython : "python");
const children = [
  spawn(
    python,
    [
      "-m",
      "uvicorn",
      "app.main:app",
      "--host",
      "127.0.0.1",
      "--port",
      "8000",
      "--reload",
    ],
    { cwd: resolve("python"), env, stdio: "inherit" },
  ),
  spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1"],
    { env, stdio: "inherit" },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  setTimeout(() => process.exit(code), 300);
}
for (const child of children) {
  child.on("error", (e) => {
    console.error(e.message);
    stop(1);
  });
  child.on("exit", (code) => stop(code || 0));
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
