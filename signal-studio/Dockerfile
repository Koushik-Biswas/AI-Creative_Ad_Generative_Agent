FROM node:22-bookworm-slim AS web-build
WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json next.config.ts ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
RUN npm run build

FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production DATA_DIR=/data PORT=10000
RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core libstdc++6 ca-certificates && rm -rf /var/lib/apt/lists/* && useradd --uid 10001 --create-home signal && mkdir -p /data /app && chown signal:signal /data /app
COPY --from=web-build /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY python/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=signal:signal python/app ./python/app
COPY --from=web-build --chown=signal:signal /workspace/.next/standalone ./web
COPY --from=web-build --chown=signal:signal /workspace/.next/static ./web/.next/static
COPY --from=web-build --chown=signal:signal /workspace/public ./web/public
COPY deploy/run.py ./run.py
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=8s CMD python -c "import urllib.request,os; urllib.request.urlopen('http://127.0.0.1:'+os.getenv('PORT','10000')+'/api/health',timeout=5)"
# The launcher initializes the disk then drops to UID/GID 10001 before starting both services.
CMD ["python", "run.py"]
