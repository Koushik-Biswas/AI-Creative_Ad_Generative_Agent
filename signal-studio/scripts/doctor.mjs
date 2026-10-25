import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const checks = [
  ["Node 22+", Number(process.versions.node.split(".")[0]) >= 22],
  ["Dependencies installed", existsSync("node_modules/next")],
  ["Local environment file", existsSync(".env.local")],
  [
    "Workspace password configured",
    (process.env.WORKSPACE_PASSWORD || "").length >= 12,
  ],
  [
    "Session secret configured",
    (process.env.SESSION_SECRET || "").length >= 32,
  ],
  [
    "Python service token configured",
    (process.env.PYTHON_SERVICE_TOKEN || "").length >= 32,
  ],
  ["Groq key configured", !!process.env.GROQ_API_KEY],
];
for (const [label, ok] of checks)
  console.log(`${ok ? "OK" : "MISSING"}: ${label}`);
const python =
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python";
if (existsSync(python)) {
  const result = spawnSync(
    python,
    [
      "-c",
      'import fastapi,httpx,bs4,PIL;print("OK: Python dependencies installed")',
    ],
    { encoding: "utf8" },
  );
  console.log(
    result.status === 0
      ? result.stdout.trim()
      : "MISSING: Python dependencies; install requirements.txt.",
  );
} else console.log("MISSING: .venv; create it with Python 3.12.");
