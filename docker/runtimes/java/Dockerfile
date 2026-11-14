# Arena runtime for Java (OpenJDK 21, Eclipse Temurin).
# BASE_REGISTRY lets you build from a mirror when Docker Hub rate-limits you.
ARG BASE_REGISTRY=docker.io/library
FROM ${BASE_REGISTRY}/eclipse-temurin:21-jdk

RUN apt-get update \
 && apt-get install -y --no-install-recommends time \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /box
LABEL org.opencontainers.image.title="arena-runtime-java"
CMD ["sleep", "infinity"]
