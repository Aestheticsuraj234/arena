# syntax=docker/dockerfile:1
# Production images for Arena. One build stage, three small runtime targets:
#
#   docker build -f docker/Dockerfile --target api    -t arena-api .
#   docker build -f docker/Dockerfile --target worker -t arena-worker .
#   docker build -f docker/Dockerfile --target web    -t arena-web \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.arena.example.com .
#
# Optional: --build-arg BASE_REGISTRY=public.ecr.aws/docker/library (Docker Hub
# rate limits) and --secret id=extra_ca,src=ca.crt (TLS-intercepting proxy).

ARG BASE_REGISTRY=docker.io/library

FROM ${BASE_REGISTRY}/node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=secret,id=extra_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca npm install -g pnpm@10.28.0
WORKDIR /repo

FROM base AS build
COPY . .
RUN --mount=type=secret,id=extra_ca,required=false \
    --mount=type=cache,id=pnpm,target=/pnpm/store \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca pnpm install --frozen-lockfile
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm turbo run build --filter=@arena/api --filter=@arena/worker --filter=@arena/web
# Self-contained folders with only production dependencies.
RUN --mount=type=secret,id=extra_ca,required=false \
    --mount=type=cache,id=pnpm,target=/pnpm/store \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca sh -c '\
      pnpm --filter @arena/api deploy --prod --legacy /out/api && \
      pnpm --filter @arena/worker deploy --prod --legacy /out/worker'

FROM ${BASE_REGISTRY}/node:22-slim AS api
WORKDIR /app
ENV NODE_ENV=production MIGRATIONS_DIR=/app/drizzle
COPY --from=build /out/api ./
COPY --from=build /repo/packages/db/drizzle ./drizzle
USER node
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD node -e "fetch('http://localhost:'+(process.env.API_PORT||4000)+'/ready').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/index.js"]

# Runs as root: it needs the Docker socket to start sandboxes. Give it a
# dedicated host (or rootless Docker); see docs/DEPLOYMENT.md.
FROM ${BASE_REGISTRY}/node:22-slim AS worker
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out/worker ./
EXPOSE 9465
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD node -e "fetch('http://localhost:'+(process.env.WORKER_METRICS_PORT||9465)+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/index.js"]

FROM ${BASE_REGISTRY}/node:22-slim AS web
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
