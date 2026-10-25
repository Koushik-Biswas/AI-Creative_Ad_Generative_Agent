# Deploy Signal Studio

Choose **A: one Render service** for the simplest full-stack deployment. Choose **B: Vercel + Render** when you specifically want the dashboard on Vercel.

## Required secrets

| Variable | Where | Requirement |
| --- | --- | --- |
| `GROQ_API_KEY` | Python service / combined Render service | Your replacement Groq key |
| `GROQ_MODEL` | Python service | `openai/gpt-oss-120b` by default |
| `WORKSPACE_PASSWORD` | Frontend / combined Render service | Choose a strong password of at least 12 characters |
| `SESSION_SECRET` | Frontend / combined Render service | Random string, at least 32 characters |
| `PYTHON_SERVICE_TOKEN` | Frontend | Same value as Python's `SERVICE_TOKEN`; at least 32 characters |
| `PYTHON_API_URL` | Vercel frontend only | Your Python service HTTPS origin, without `/api` |
| `SERVICE_TOKEN` | Separate Python service only | Same secret as frontend's `PYTHON_SERVICE_TOKEN` |
| `DATA_DIR` | Python service | Persistent disk path |

`npm run setup` generates local secrets without printing them. Render's blueprint can generate deployment secrets. Never use a `NEXT_PUBLIC_` prefix for any of these secrets.

## Push the extracted project to a new GitHub repository

Create an empty repository in your GitHub account. From the extracted `signal-studio` folder:

```sh
git init
git add .
git commit -m "Add Signal Studio full-stack application"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

If you are updating an existing repository with history, create a feature branch and open a pull request. Do not force-push over remote work. `.gitignore` excludes keys, local databases, uploads, build output and dependency folders.

## A. Entire application on Render

1. Connect the GitHub repository to Render.
2. Create a **Web Service** using **Docker**, or create a Blueprint using `render.yaml`.
3. If the extracted app is the repository root, use the defaults in `render.yaml`. If using the provided existing-repository branch, select **Root Directory: `signal-studio`**, Dockerfile `./Dockerfile`, Docker context `.`. If using a Blueprint from a nested folder, add the appropriate `rootDir` before applying it.
4. Use a service plan that supports a persistent disk. Attach a disk at **`/data`**, and set `DATA_DIR=/data`. The example blueprint requests a paid `starter` service and a 1 GB disk; review current pricing in your Render account before creating resources.
5. Set `GROQ_API_KEY` and `WORKSPACE_PASSWORD`. Generate `SESSION_SECRET` and `PYTHON_SERVICE_TOKEN` as runtime secrets.
6. Set health-check path to **`/api/health`**. The launcher uses Render's provided `PORT` and starts both Next.js and Python.
7. Deploy. Open the Render URL, log in using `WORKSPACE_PASSWORD`, and create your first campaign.

In this combined mode, the launcher connects the gateway to the Python process over localhost. You do not need to configure an external Python URL or expose port 8000 publicly. Application processes run as UID 10001 after the persistent-disk directory is initialized.

`docker compose up --build -d` uses the same image locally. The Docker build must run on a host with Docker; the included source was checked with a Next.js production build and Python tests, and a Docker image build requires your Docker environment.

## B. Vercel frontend + Render Python backend

### 1. Deploy Python on Render

Create a separate Web Service with:

| Setting | Value |
| --- | --- |
| Root Directory | `python` when the app is repo root; `signal-studio/python` in the existing repository branch |
| Runtime | Python 3.12 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check | `/api/health` |
| Persistent Disk | Mount at `/var/data` |
| `DATA_DIR` | `/var/data` |
| `SERVICE_TOKEN` | A random secret of at least 32 characters |
| `GROQ_API_KEY` | Your replacement key |
| `DEV_AUTH` | `0` |

`deploy/render-python.yaml` contains a starter Blueprint for this option. Do not use the older `python/render.yaml` if it still describes a different repository root.

Copy the deployed HTTPS **origin**, for example `https://your-service.onrender.com`. The health endpoint should return JSON with `status: "ok"`.

### 2. Deploy Next.js on Vercel

1. Import the GitHub repository into Vercel.
2. Set Root Directory to the extracted application folder (`.` for a new repo, `signal-studio` for the existing-repository branch).
3. Framework: **Next.js**. Node version: **22.x**. Install: `npm ci`. Build: `npm run build`. Leave Output Directory at its framework default.
4. Set `PYTHON_API_URL` to the backend HTTPS origin and `PYTHON_SERVICE_TOKEN` to the **same** value as the backend's `SERVICE_TOKEN`.
5. Set `WORKSPACE_PASSWORD`, `SESSION_SECRET`, and optionally `WORKSPACE_ID=workspace-owner`.
6. Use Fluid compute/function duration support compatible with the configured `maxDuration=240`. If your account uses older 60-second function limits, reduce `maxDuration` and expect long research tasks to need retries or move the frontend to the combined Render option.
7. Deploy and open the Vercel URL. Log in and create a campaign.

The Groq key belongs on the Python backend in this split deployment. The frontend does not call Groq directly. `.vercelignore` excludes Python, local environments and unrelated build inputs from the Vercel upload; Python dependencies are not bundled into a Vercel function.

The gateway caps uploads at **4 MB** to stay below Vercel's request limit. The underlying Python API accepts up to 5 MB. Campaign image ZIPs are generated in the browser, avoiding serverless response-size limits.

## Optional competitor collection

Configure `AD_LIBRARY_API_URL` and `AD_LIBRARY_API_KEY` on the **Python service**, using the contract in `docs/COLLECTOR.md`. This must be a trusted service you are authorized to use. No paid collector account or universal ad-library access is bundled. Manual source-linked imports work without it.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Pillow install fails | Use Python 3.12; recreate `.venv` and reinstall requirements |
| Workspace login says backend is not ready | Verify Python URL, service-token match, service status and persistent disk |
| Incorrect password | Use `WORKSPACE_PASSWORD` from the deployment environment, not the Groq key |
| Too many sign-in attempts | Wait 15 minutes; the Python database keeps attempt counters |
| Groq authentication/quota error | Replace the runtime key or check provider quota; never put it in source |
| Campaigns disappear after redeploy | Mount persistent storage and point `DATA_DIR` at it |
| Campaign changed in another tab | Reload and retry; stale writes are intentionally rejected |
| No competitor ads collected | Import evidence manually or connect an authorized collector; do not assume no ads exist |
| Vercel request timeout | Enable compatible Fluid compute settings or use the single Render deployment |
| Git rejects a push | Pull/rebase remote work or use a feature branch; do not bypass secret scanning |

## Official deployment references

- https://nextjs.org/docs/app/getting-started/deploying
- https://render.com/docs/deploy-nextjs-app
- https://render.com/docs/disks
- https://vercel.com/docs/functions/configuring-functions/duration
- https://vercel.com/docs/functions/limitations
