#!/usr/bin/env bash
# Starts Nigiri with Esplora on 8282 and Chopsticks on 3030 so host ports never use 5000
# (macOS AirPlay) or 3000 (Podverse web app). We always patch the compose and run
# docker compose ourselves so port 3000 is never bound.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$(uname -s)" = "Darwin" ]; then
  NIGIRI_DATADIR="${HOME}/Library/Application Support/Nigiri"
else
  NIGIRI_DATADIR="${HOME}/.nigiri"
fi

# 1) Write override for when we run compose
"$SCRIPT_DIR/ensure-nigiri-port-override.sh"

# 2) Ensure compose exists (Nigiri creates it on first start; that start may fail on port 3000)
COMPOSE_DIR=""
for dir in "${NIGIRI_DATADIR}/regtest" "$NIGIRI_DATADIR"; do
  if [ -f "${dir}/docker-compose.yml" ]; then
    COMPOSE_DIR="$dir"
    break
  fi
done

if [ -z "$COMPOSE_DIR" ]; then
  echo "Creating Nigiri stack (may fail on port 3000 once)..."
  nigiri start --ln || true
  for dir in "${NIGIRI_DATADIR}/regtest" "$NIGIRI_DATADIR"; do
    if [ -f "${dir}/docker-compose.yml" ]; then
      COMPOSE_DIR="$dir"
      break
    fi
  done
fi

if [ -z "$COMPOSE_DIR" ]; then
  echo "ERROR: No docker-compose.yml found in $NIGIRI_DATADIR (or regtest/)."
  exit 1
fi

# 3) Patch so Esplora=8282, Chopsticks=3030 (never use 5000 or 3000 on host)
echo "Patching Esplora 5000->8282 and Chopsticks 3000->3030 in $COMPOSE_DIR/docker-compose.yml..."
sed -e 's/- 5000:5000/- 8282:5000/' \
    -e 's/- "3000:3000"/- "3030:3000"/' \
    -e 's/- 3000:3000/- 3030:3000/' \
    "${COMPOSE_DIR}/docker-compose.yml" > "${COMPOSE_DIR}/docker-compose.yml.tmp"
mv "${COMPOSE_DIR}/docker-compose.yml.tmp" "${COMPOSE_DIR}/docker-compose.yml"

# 4) Start stack with patched ports (same service set as nigiri start --ln)
cd "$COMPOSE_DIR"
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d bitcoin electrs chopsticks esplora lnd cln tap
