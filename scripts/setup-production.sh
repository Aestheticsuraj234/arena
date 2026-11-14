#!/usr/bin/env bash
# One-command production setup on a fresh Linux host with Docker.
#
#   ./scripts/setup-production.sh arena.example.com     # HTTPS, api.arena.example.com for the API
#   ./scripts/setup-production.sh                       # HTTP on this machine's IP (private networks)
#
# Point DNS A records for both <domain> and api.<domain> at this host first,
# and open ports 80 and 443.
set -euo pipefail
cd "$(dirname "$0")/.."

DOMAIN="${1:-}"
ENV_FILE=.env.production

command -v docker >/dev/null || { echo "Docker is required: https://docs.docker.com/engine/install/"; exit 1; }
docker compose version >/dev/null || { echo "Docker Compose v2 is required."; exit 1; }

secret() { openssl rand -base64 32 | tr -d '/+=' | cut -c1-40; }

if [[ -f "$ENV_FILE" ]]; then
  echo "Using existing $ENV_FILE"
else
  if [[ -n "$DOMAIN" ]]; then
    WEB_ADDRESS="$DOMAIN"; API_ADDRESS="api.$DOMAIN"
    WEB_URL="https://$DOMAIN"; API_URL="https://api.$DOMAIN"; COOKIE_DOMAIN="$DOMAIN"
  else
    IP="$(hostname -I | awk '{print $1}')"
    echo "No domain given: serving HTTP on $IP (web :80, API :8080). Tokens travel unencrypted."
    WEB_ADDRESS="http://$IP"; API_ADDRESS="http://$IP:8080"
    WEB_URL="http://$IP"; API_URL="http://$IP:8080"; COOKIE_DOMAIN=""
  fi
  cat > "$ENV_FILE" <<EOF
WEB_ADDRESS=$WEB_ADDRESS
API_ADDRESS=$API_ADDRESS
WEB_URL=$WEB_URL
API_URL=$API_URL
COOKIE_DOMAIN=$COOKIE_DOMAIN
ACME_EMAIL=admin@${DOMAIN:-example.com}
POSTGRES_PASSWORD=$(secret)
BETTER_AUTH_SECRET=$(secret)
GRAFANA_ADMIN_PASSWORD=$(secret)
METRICS_TOKEN=
WORKER_CONCURRENCY=$(nproc)
RATE_LIMIT_PER_MINUTE=120
SEED_PROBLEMS=true
EOF
  chmod 600 "$ENV_FILE"
  echo "Wrote $ENV_FILE (keep it private)"
fi

echo "==> Building sandbox runtime images"
./scripts/build-images.sh

echo "==> Building and starting the stack"
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d --build

# shellcheck disable=SC1090
source "$ENV_FILE"
echo "==> Waiting for the API"
for _ in $(seq 1 60); do
  if docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" exec -T api \
      node -e "fetch('http://localhost:4000/ready').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" 2>/dev/null; then
    echo
    echo "Arena is up."
    echo "  Web:      $WEB_URL"
    echo "  API:      $API_URL  (Judge0-compatible: $API_URL/submissions)"
    echo "  Grafana:  ssh -L 3001:localhost:3001 <host>, then http://localhost:3001 (admin / see $ENV_FILE)"
    exit 0
  fi
  sleep 2
done
echo "The API did not become ready. Check: docker compose -f docker-compose.prod.yml logs api"
exit 1
