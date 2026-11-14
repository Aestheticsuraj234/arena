# Arena runtime for C and C++ (GCC 14).
# BASE_REGISTRY lets you build from a mirror when Docker Hub rate-limits you.
ARG BASE_REGISTRY=docker.io/library
FROM ${BASE_REGISTRY}/gcc:14-bookworm

# GNU time reports peak memory (%M) and wall time for each run.
RUN apt-get update \
 && apt-get install -y --no-install-recommends time \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /box
LABEL org.opencontainers.image.title="arena-runtime-gcc"
CMD ["sleep", "infinity"]
