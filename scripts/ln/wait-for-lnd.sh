#!/usr/bin/env bash
set -euo pipefail

MAX_ATTEMPTS=60
SLEEP_SECONDS=2

echo "Waiting for LND to be ready..."

is_lnd_ready() {
  # Preferred path when Nigiri tracks the running stack.
  if nigiri lnd getinfo >/dev/null 2>&1; then
    return 0
  fi

  # Fallback path when containers were started by docker compose directly.
  if docker exec lnd lncli --network=regtest getinfo >/dev/null 2>&1; then
    return 0
  fi

  return 1
}

for i in $(seq 1 $MAX_ATTEMPTS); do
  if is_lnd_ready; then
    echo "LND is ready."
    exit 0
  fi
  echo "  Attempt $i/$MAX_ATTEMPTS: LND not ready yet, waiting ${SLEEP_SECONDS}s..."
  sleep $SLEEP_SECONDS
done

echo "ERROR: LND did not become ready within $((MAX_ATTEMPTS * SLEEP_SECONDS)) seconds."
exit 1
