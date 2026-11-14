#!/usr/bin/env bash
# Builds the Arena language runtime images.
#
#   ./scripts/build-images.sh                 build for this machine (amd64 or arm64)
#   PUSH=1 REGISTRY=docker.io/you ./scripts/build-images.sh
#                                             build amd64 + arm64 with buildx and push
#   BASE_REGISTRY=public.ecr.aws/docker/library ./scripts/build-images.sh
#                                             pull base images from a mirror
#   EXTRA_CA_CERT=/path/ca.crt ./scripts/build-images.sh
#                                             trust a proxy CA during npm install
set -euo pipefail

cd "$(dirname "$0")/.."
TAG="${TAG:-1}"
REGISTRY="${REGISTRY:-}"
RUNTIMES=(gcc java node python)
BUILD_ARGS=()
[[ -n "${BASE_REGISTRY:-}" ]] && BUILD_ARGS+=(--build-arg "BASE_REGISTRY=${BASE_REGISTRY}")
[[ -n "${EXTRA_CA_CERT:-}" ]] && BUILD_ARGS+=(--secret "id=extra_ca,src=${EXTRA_CA_CERT}")

for runtime in "${RUNTIMES[@]}"; do
  name="arena-runtime-${runtime}:${TAG}"
  [[ -n "$REGISTRY" ]] && name="${REGISTRY}/${name}"
  echo "==> ${name}"
  if [[ "${PUSH:-0}" == "1" ]]; then
    docker buildx build --platform linux/amd64,linux/arm64 --push "${BUILD_ARGS[@]}" \
      -t "$name" "docker/runtimes/${runtime}"
  else
    docker build -q "${BUILD_ARGS[@]}" -t "$name" "docker/runtimes/${runtime}"
  fi
done
echo "Done."
