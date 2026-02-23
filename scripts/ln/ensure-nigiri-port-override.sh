#!/usr/bin/env bash
# Ensures Nigiri's Esplora uses host port 8282 instead of 5000 to avoid conflicts
# (e.g. macOS AirPlay Receiver on 5000). Writes docker-compose.override.yml into
# Nigiri's data directory so Docker Compose merges it when nigiri start runs.
set -euo pipefail

if [ "$(uname -s)" = "Darwin" ]; then
  NIGIRI_DATADIR="${HOME}/Library/Application Support/Nigiri"
else
  NIGIRI_DATADIR="${HOME}/.nigiri"
fi

# Esplora 8282 avoids macOS AirPlay on 5000; Chopsticks 3030 avoids Podverse web app on 3000
OVERRIDE_CONTENT='name: nigiri
services:
  esplora:
    ports:
      - "8282:5000"
  chopsticks:
    ports:
      - "3030:3000"
'

# Nigiri may put docker-compose.yml in the data dir root or in regtest/; write override to both
for dir in "$NIGIRI_DATADIR" "${NIGIRI_DATADIR}/regtest"; do
  mkdir -p "$dir"
  echo "$OVERRIDE_CONTENT" > "${dir}/docker-compose.override.yml"
done

echo "Nigiri port overrides: Esplora 8282->5000, Chopsticks 3030->3000 (in $NIGIRI_DATADIR and regtest/)"
