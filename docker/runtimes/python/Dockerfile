# Arena runtime for Python 3.12.
# BASE_REGISTRY lets you build from a mirror when Docker Hub rate-limits you.
ARG BASE_REGISTRY=docker.io/library
FROM ${BASE_REGISTRY}/python:3.12-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends time \
 && rm -rf /var/lib/apt/lists/*

# No .pyc files: the sandbox filesystem is read-only.
ENV PYTHONDONTWRITEBYTECODE=1
WORKDIR /box
LABEL org.opencontainers.image.title="arena-runtime-python"
CMD ["sleep", "infinity"]
