import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
const text = `# Generated locally. Never commit this file.\nGROQ_API_KEY=\nGROQ_MODEL=openai/gpt-oss-120b\nWORKSPACE_PASSWORD=${randomBytes(18).toString("base64url")}\nSESSION_SECRET=${randomBytes(48).toString("base64url")}\nWORKSPACE_ID=workspace-owner\nPYTHON_API_URL=http://127.0.0.1:8000\nPYTHON_SERVICE_TOKEN=${randomBytes(48).toString("base64url")}\nAD_LIBRARY_API_URL=\nAD_LIBRARY_API_KEY=\n`;
try {
  await writeFile(".env.local", text, { flag: "wx", mode: 0o600 });
  console.log(
    "Created .env.local. Open it privately to set GROQ_API_KEY and choose WORKSPACE_PASSWORD. Other secrets are already generated.",
  );
} catch (e) {
  if (e.code === "EEXIST")
    console.log(".env.local already exists; preserved without changes.");
  else throw e;
}
