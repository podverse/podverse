#!/usr/bin/env bash
# Starts Nigiri with Esplora on 8282 and Chopsticks on 3030 so host ports never use 5000
# (macOS AirPlay) or 3000 (Podverse web app). Also patches CLN to use a named volume
# instead of a bind mount (fixes Unix socket issues on macOS Docker Desktop).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$(uname -s)" = "Darwin" ]; then
  NIGIRI_DATADIR="${HOME}/Library/Application Support/Nigiri"
else
  NIGIRI_DATADIR="${HOME}/.nigiri"
fi

# 1) Write override file (ports + user)
"$SCRIPT_DIR/ensure-nigiri-port-override.sh"

# 2) Ensure compose file exists by letting Nigiri start (may fail on port conflicts, that's ok)
COMPOSE_DIR=""
for dir in "${NIGIRI_DATADIR}/regtest" "$NIGIRI_DATADIR"; do
  if [ -f "${dir}/docker-compose.yml" ]; then
    COMPOSE_DIR="$dir"
    break
  fi
done

if [ -z "$COMPOSE_DIR" ]; then
  echo "Creating Nigiri stack (first run, may fail on port 3000)..."
  nigiri start --ln 2>&1 || true
  sleep 2
  for dir in "${NIGIRI_DATADIR}/regtest" "$NIGIRI_DATADIR"; do
    if [ -f "${dir}/docker-compose.yml" ]; then
      COMPOSE_DIR="$dir"
      break
    fi
  done
fi

if [ -z "$COMPOSE_DIR" ]; then
  echo "ERROR: Could not find or create docker-compose.yml in $NIGIRI_DATADIR"
  exit 1
fi

# 3) Stop Nigiri so we can patch and restart cleanly
nigiri stop 2>/dev/null || true

# 4) Patch compose file: ports + CLN volume
COMPOSE_FILE="${COMPOSE_DIR}/docker-compose.yml"

# Patch ports to avoid conflicts (5000=macOS AirPlay, 3000=Podverse web)
echo "Patching ports: 5000->8282, 3000->3030..."
sed -i.bak \
    -e 's/- 5000:5000/- 8282:5000/' \
    -e 's/- "5000:5000"/- "8282:5000"/' \
    -e 's/- 3000:3000/- 3030:3000/' \
    -e 's/- "3000:3000"/- "3030:3000"/' \
    "$COMPOSE_FILE"
rm -f "${COMPOSE_FILE}.bak"

# Patch CLN volume: bind mount -> named volume
if grep -q './volumes/lightningd:/.lightning' "$COMPOSE_FILE" 2>/dev/null; then
  echo "Patching CLN volume: bind mount -> named volume..."
  sed -i.bak 's|./volumes/lightningd:/.lightning|nigiri_cln_data:/.lightning|g' "$COMPOSE_FILE"
  rm -f "${COMPOSE_FILE}.bak"
fi

# 5) Add top-level volume definition if not present
if grep -q 'nigiri_cln_data:/.lightning' "$COMPOSE_FILE" && ! grep -q '^  nigiri_cln_data:' "$COMPOSE_FILE"; then
  echo "Adding volume definition..."
  if grep -q '^volumes:' "$COMPOSE_FILE"; then
    # Insert after existing volumes: line
    sed -i.bak '/^volumes:/a\
  nigiri_cln_data:
' "$COMPOSE_FILE"
    rm -f "${COMPOSE_FILE}.bak"
  else
    # Append new volumes section
    echo "" >> "$COMPOSE_FILE"
    echo "volumes:" >> "$COMPOSE_FILE"
    echo "  nigiri_cln_data:" >> "$COMPOSE_FILE"
  fi
fi

echo "CLN patch complete"

# 6) Start stack with patched compose + override
cd "$COMPOSE_DIR"
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d bitcoin electrs chopsticks esplora lnd cln tap
