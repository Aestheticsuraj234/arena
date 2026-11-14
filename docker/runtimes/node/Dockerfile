# syntax=docker/dockerfile:1
# Arena runtime for JavaScript and TypeScript (Node.js 22, TypeScript 5).
# BASE_REGISTRY lets you build from a mirror when Docker Hub rate-limits you.
ARG BASE_REGISTRY=docker.io/library
FROM ${BASE_REGISTRY}/node:22-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends time \
 && rm -rf /var/lib/apt/lists/*

# Optional `extra_ca` secret: trust a corporate proxy's CA during npm install.
RUN --mount=type=secret,id=extra_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca npm install -g typescript@5 @types/node@22 \
 && npm cache clean --force

WORKDIR /box
LABEL org.opencontainers.image.title="arena-runtime-node"
CMD ["sleep", "infinity"]
