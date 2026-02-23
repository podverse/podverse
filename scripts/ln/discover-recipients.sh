#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$REPO_ROOT/tools/test-assets/config/ln-recipients.local.json"

echo "Discovering Lightning node pubkeys..."

get_recipient_pubkey() {
  local container="$1"
  docker exec "$container" lncli --network=regtest getinfo | jq -r '.identity_pubkey'
}

ALICE_PUBKEY=$(get_recipient_pubkey "podverse_local_lnd_alice")
if [ -z "$ALICE_PUBKEY" ] || [ "$ALICE_PUBKEY" = "null" ]; then
  echo "ERROR: Could not get alice pubkey (is podverse_local_lnd_alice running?)"
  exit 1
fi

BOB_PUBKEY=$(get_recipient_pubkey "podverse_local_lnd_bob")
if [ -z "$BOB_PUBKEY" ] || [ "$BOB_PUBKEY" = "null" ]; then
  echo "ERROR: Could not get bob pubkey (is podverse_local_lnd_bob running?)"
  exit 1
fi

FEE_PUBKEY=$(get_recipient_pubkey "podverse_local_lnd_fee")
if [ -z "$FEE_PUBKEY" ] || [ "$FEE_PUBKEY" = "null" ]; then
  echo "ERROR: Could not get fee pubkey (is podverse_local_lnd_fee running?)"
  exit 1
fi

LNURL_DOMAIN="localhost:3003"

cat > "$CONFIG_FILE" <<EOF
{
  "keysend": [
    { "address": "$ALICE_PUBKEY", "name": "Alice", "split": 60 },
    { "address": "$BOB_PUBKEY", "name": "Bob", "split": 39 },
    { "address": "$FEE_PUBKEY", "name": "Fee", "split": 1, "fee": true }
  ],
  "lnaddress": [
    { "address": "alice@$LNURL_DOMAIN", "name": "Alice", "split": 60 },
    { "address": "bob@$LNURL_DOMAIN", "name": "Bob", "split": 39 },
    { "address": "fee@$LNURL_DOMAIN", "name": "Fee Recipient", "split": 1, "fee": true }
  ]
}
EOF

echo ""
echo "Wrote $CONFIG_FILE:"
echo "  alice pubkey: $ALICE_PUBKEY"
echo "  bob   pubkey: $BOB_PUBKEY"
echo "  fee   pubkey: $FEE_PUBKEY"
echo "  LNURL domain: $LNURL_DOMAIN"
echo ""
