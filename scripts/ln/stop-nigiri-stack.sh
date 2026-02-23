#!/usr/bin/env bash
# Stops and removes the Nigiri Docker stack by running docker compose down in Nigiri's
# data directory. Use this so that local_ln_clean / local_clean tear down V4V containers
# even when the nigiri CLI is not in PATH (e.g. make run outside nix develop .#v4v).
# Usage: stop-nigiri-stack.sh [--volumes]   (--volumes removes volumes, for clean)
set -euo pipefail

REMOVE_VOLUMES=""
if [ "${1:-}" = "--volumes" ] || [ "${1:-}" = "-v" ]; then
  REMOVE_VOLUMES="-v"
fi

if [ "$(uname -s)" = "Darwin" ]; then
  NIGIRI_DATADIR="${HOME}/Library/Application Support/Nigiri"
else
  NIGIRI_DATADIR="${HOME}/.nigiri"
fi

for dir in "${NIGIRI_DATADIR}/regtest" "$NIGIRI_DATADIR"; do
  if [ ! -d "$dir" ]; then
    continue
  fi
  if [ -f "${dir}/docker-compose.yml" ]; then
    echo "Stopping Nigiri stack in $dir..."
    DOWN_OPTS="--remove-orphans $REMOVE_VOLUMES"
    if [ -f "${dir}/docker-compose.override.yml" ]; then
      docker compose -f "${dir}/docker-compose.yml" -f "${dir}/docker-compose.override.yml" down $DOWN_OPTS 2>/dev/null || true
    else
      docker compose -f "${dir}/docker-compose.yml" down $DOWN_OPTS 2>/dev/null || true
    fi
  fi
done
