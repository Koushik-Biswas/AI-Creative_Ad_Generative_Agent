# Open this project in VS Code

1. Extract the ZIP. Open the **signal-studio** folder in VS Code.
2. Read this file, then `DEPLOYMENT.md` for hosting.
3. The complete original requirements are in `docs/PROJECT_REQUIREMENTS.md`.
4. Read `docs/IMPLEMENTATION.md` for what this release implements and what remains.

## Software you need

| Software / account | Why |
| --- | --- |
| Node.js 22.13 or newer in the 22 LTS line | Dashboard and API gateway |
| Python 3.12 | FastAPI, website research, LLM orchestration and image rendering |
| Git and a GitHub account | Source control and deployment integration |
| A Groq API key | LLM research, concepts and copy revisions |
| Docker Desktop (optional) | Easiest way to run everything in one container |
| Render account | Host the full stack and persistent project data |
| Vercel account (optional) | Alternative frontend hosting, with Python still on Render |

Use Python **3.12**, not Python 3.14, for this pinned dependency set. This avoids the Pillow installation issue you encountered earlier.

## Local start on Windows PowerShell

Run these commands in the extracted project folder:

```powershell
npm ci
npm run setup
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
code .env.local
```

In `.env.local`, add your replacement Groq key and choose `WORKSPACE_PASSWORD`. Other secrets are generated automatically. Do not commit this file.

```powershell
npm run dev:all
```

Open **http://localhost:3000** and log in with the password from `.env.local`.

## Local start on macOS / Linux

```sh
npm ci
npm run setup
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

Edit `.env.local` privately, then run `npm run dev:all`. Both servers start together. Stop them with Ctrl+C.

## Docker option

After `npm run setup` and editing `.env.local`:

```sh
docker compose up --build -d
```

Open http://localhost:3000. `docker compose down` stops it; the named volume preserves projects and assets. Deleting the volume deletes that data.

## First campaign

1. Create a campaign with a public website URL or a detailed manual description.
2. Research the business, edit the profile and confirm it.
3. Add or suggest competitors, save the list, then confirm it.
4. Import real ads from the official public libraries, or continue with clearly labelled hypotheses.
5. Build the report and brief. Approve your chosen concepts.
6. Generate formats, edit and approve creatives, then download the campaign ZIP.

The Orbit example is fictional demonstration data. The app does not invent competitor ads or performance results.

## Important limits

The Groq key powers text, not diffusion photography. This release renders branded image layouts with accurate typography and abstract forms. Automatic ad-library collection needs a separately authorized provider; manual source-linked import works without one. Team roles, custom fonts, a full canvas editor and complete automated platform-policy checks are not included.

The complete app works as one Docker service on Render. For Vercel, deploy the Next.js frontend there and the Python backend on Render. Do not place SQLite or private uploads in Vercel's temporary filesystem.
