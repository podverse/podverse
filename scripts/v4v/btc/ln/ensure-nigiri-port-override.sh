#!/usr/bin/env bash
# Ensures Nigiri's Esplora uses host port 8282 instead of 5000 to avoid conflicts
# (e.g. macOS AirPlay Receiver on 5000). Writes docker-compose.override.yml into
# Nigiri's data directory so Docker Compose merges it when we run the stack.
# Also sets CLN to run as root (user override works since it's a scalar replacement).
set -euo pipefail

if [ "$(uname -s)" = "Darwin" ]; then
  NIGIRI_DATADIR="${HOME}/Library/Application Support/Nigiri"
else
  NIGIRI_DATADIR="${HOME}/.nigiri"
fi

# Override for CLN user only - ports are patched in the base file by start script.
# Note: Scalar values like 'user' get REPLACED by override (not appended like arrays).
OVERRIDE_CONTENT='name: nigiri
services:
  cln:
    user: "0:0"
'

# Nigiri may put docker-compose.yml in the data dir root or in regtest/; write override to both
for dir in "$NIGIRI_DATADIR" "${NIGIRI_DATADIR}/regtest"; do
  mkdir -p "$dir"
  echo "$OVERRIDE_CONTENT" > "${dir}/docker-compose.override.yml"
done

echo "Nigiri CLN override: user=0:0 (in $NIGIRI_DATADIR and regtest/)"
