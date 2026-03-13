#!/usr/bin/env bash
# Provisions the three LND recipient nodes (alice, bob, fee) after they start:
#   - Funds each on-chain wallet via Nigiri's Bitcoin Core
#   - Connects the main Nigiri LND to each recipient node
#   - Opens a channel from main LND to each recipient node
# Idempotent: skips any step that is already complete.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
cd "$REPO_ROOT"

FUND_AMOUNT_BTC=0.1
CHANNEL_CAPACITY_SATS=200000
CONFIRM_BLOCKS=6
MAX_WAIT_ATTEMPTS=60
WAIT_SLEEP=2
MAX_PEER_ATTEMPTS=20
PEER_POLL_SLEEP=2
MAX_OPEN_CHANNEL_ATTEMPTS=4
OPEN_CHANNEL_SLEEP=2

ALICE_CONTAINER="podverse_local_lnd_alice"
BOB_CONTAINER="podverse_local_lnd_bob"
FEE_CONTAINER="podverse_local_lnd_fee"

# P2P ports on the host for each recipient node (used by main Nigiri LND to connect)
ALICE_P2P_PORT=9736
BOB_P2P_PORT=9737
FEE_P2P_PORT=9738

# --- Helpers ---

bitcoin_rpc() {
  if command -v nigiri >/dev/null 2>&1 && nigiri rpc "$@" 2>/dev/null; then
    return 0
  fi
  docker exec bitcoin bitcoin-cli -regtest "$@"
}

mine_blocks() {
  local n="${1:-$CONFIRM_BLOCKS}"
  local addr
  addr=$(bitcoin_rpc getnewaddress "" "bech32")
  if bitcoin_rpc generatetoaddress "$n" "$addr" >/dev/null 2>&1; then
    return 0
  fi
  bitcoin_rpc generate "$n" >/dev/null 2>&1 || true
}

lnd_cmd() {
  if command -v nigiri >/dev/null 2>&1 && nigiri lnd "$@" 2>/dev/null; then
    return 0
  fi
  docker exec lnd lncli --network=regtest "$@"
}

recipient_lncli() {
  local container="$1"
  shift
  docker exec "$container" lncli --network=regtest --lnddir=/data/.lnd "$@"
}

is_peer_connected() {
  local pubkey="$1"
  lnd_cmd listpeers 2>/dev/null | jq -e --arg pk "$pubkey" '.peers[]? | select(.pub_key == $pk)' >/dev/null 2>&1
}

has_channel_or_pending() {
  local pubkey="$1"
  local channels
  channels=$(lnd_cmd listchannels 2>/dev/null | jq -r --arg pk "$pubkey" '[.channels[] | select(.remote_pubkey == $pk)] | length')
  local pending
  pending=$(lnd_cmd pendingchannels 2>/dev/null | jq -r --arg pk "$pubkey" '[.pending_open_channels[]? | select(.channel.remote_node_pub == $pk)] | length' 2>/dev/null || echo "0")
  [ "${channels:-0}" -gt 0 ] || [ "${pending:-0}" -gt 0 ]
}

wait_for_peer_connected() {
  local pubkey="$1"
  local name="$2"
  local i
  echo "Waiting for $name peer in main LND listpeers..."
  for i in $(seq 1 $MAX_PEER_ATTEMPTS); do
    if is_peer_connected "$pubkey"; then
      return 0
    fi
    if [ "$i" -eq $MAX_PEER_ATTEMPTS ]; then
      echo "ERROR: $name peer did not appear in listpeers."
      return 1
    fi
    echo "  Attempt $i/$MAX_PEER_ATTEMPTS: peer not in listpeers, waiting ${PEER_POLL_SLEEP}s..."
    sleep $PEER_POLL_SLEEP
  done
}

connect_main_to_peer() {
  local pubkey="$1"
  local name="$2"
  local p2p_port="$3"
  local i
  local connect_output=""
  echo "Connecting main LND to $name (host.docker.internal:$p2p_port)..."
  for i in $(seq 1 $MAX_PEER_ATTEMPTS); do
    connect_output=$(lnd_cmd connect "${pubkey}@host.docker.internal:${p2p_port}" 2>&1 || true)
    if [ -n "$connect_output" ]; then
      echo "$connect_output"
    fi

    if is_peer_connected "$pubkey" || [[ "$connect_output" == *"already connected to peer"* ]]; then
      return 0
    fi

    if [ "$i" -eq $MAX_PEER_ATTEMPTS ]; then
      echo "ERROR: Could not connect main LND to $name."
      return 1
    fi
    echo "  Attempt $i/$MAX_PEER_ATTEMPTS: connect to $name failed, waiting ${PEER_POLL_SLEEP}s..."
    sleep $PEER_POLL_SLEEP
  done
}

# Wait for a recipient node container to respond to lncli getinfo
wait_for_node() {
  local container="$1"
  local name="$2"
  echo "Waiting for $name ($container) to be ready..."
  local i
  local info=""
  for i in $(seq 1 $MAX_WAIT_ATTEMPTS); do
    info=$(recipient_lncli "$container" getinfo 2>/dev/null || true)
    if [ -n "$info" ]; then
      if echo "$info" | jq -e '.synced_to_chain == true' >/dev/null 2>&1; then
        echo "  $name is ready (synced_to_chain=true)."
        return 0
      fi
      local height
      height=$(echo "$info" | jq -r '.block_height // "unknown"' 2>/dev/null || echo "unknown")
      # LND sometimes does not set synced_to_chain=true when already at chain tip (no new block).
      # Mine one block to trigger ZMQ so the node flips to synced.
      if [ -n "$height" ] && [ "$height" != "unknown" ] && [ "$height" != "null" ]; then
        local chain_blocks
        chain_blocks=$(bitcoin_rpc getblockchaininfo 2>/dev/null | jq -r '.blocks // empty')
        if [ -n "$chain_blocks" ] && [ "$height" -eq "$chain_blocks" ]; then
          echo "  $name at chain tip (height=$height) but synced_to_chain false; mining one block to nudge..."
          mine_blocks 1
          sleep 3
        fi
      fi
      echo "  Attempt $i/$MAX_WAIT_ATTEMPTS: $name RPC up but still syncing chain (height=$height), waiting ${WAIT_SLEEP}s..."
      sleep $WAIT_SLEEP
      continue
    fi
    echo "  Attempt $i/$MAX_WAIT_ATTEMPTS: $name not ready yet, waiting ${WAIT_SLEEP}s..."
    sleep $WAIT_SLEEP
  done
  echo "ERROR: $name did not become chain-synced within $((MAX_WAIT_ATTEMPTS * WAIT_SLEEP)) seconds."
  echo "Last getinfo snapshot for $name:"
  [ -n "$info" ] && echo "$info"
  echo "Recent $name container logs:"
  docker logs --tail 40 "$container" 2>/dev/null || true
  return 1
}

# Fund a recipient node's on-chain wallet if it has no balance
fund_node() {
  local container="$1"
  local name="$2"
  local total
  total=$(recipient_lncli "$container" walletbalance 2>/dev/null | jq -r '.total_balance // 0')
  if [ -n "$total" ] && [ "$total" != "null" ] && [ "${total:-0}" -gt 0 ]; then
    echo "$name already has on-chain balance, skipping fund."
    return 0
  fi
  echo "Funding $name with $FUND_AMOUNT_BTC BTC..."
  local addr
  addr=$(recipient_lncli "$container" newaddress p2wkh | jq -r '.address')
  bitcoin_rpc sendtoaddress "$addr" $FUND_AMOUNT_BTC >/dev/null
  echo "Funded $name."
}

# Get a recipient node's pubkey
get_pubkey() {
  local container="$1"
  recipient_lncli "$container" getinfo | jq -r '.identity_pubkey'
}

# Connect main LND to a recipient node and open a channel (idempotent)
connect_and_open_channel() {
  local container="$1"
  local name="$2"
  local p2p_port="$3"

  local pubkey
  pubkey=$(get_pubkey "$container")
  if [ -z "$pubkey" ] || [ "$pubkey" = "null" ]; then
    echo "ERROR: Could not get pubkey for $name."
    return 1
  fi
  echo "$name pubkey: $pubkey"

  # Check if channel already exists
  if has_channel_or_pending "$pubkey"; then
    local channels
    channels=$(lnd_cmd listchannels 2>/dev/null | jq -r --arg pk "$pubkey" '[.channels[] | select(.remote_pubkey == $pk)] | length')
    local pending
    pending=$(lnd_cmd pendingchannels 2>/dev/null | jq -r --arg pk "$pubkey" '[.pending_open_channels[]? | select(.channel.remote_node_pub == $pk)] | length' 2>/dev/null || echo "0")
    echo "Channel to $name already exists (open=$channels pending=$pending), skipping."
    return 0
  fi

  connect_main_to_peer "$pubkey" "$name" "$p2p_port"
  wait_for_peer_connected "$pubkey" "$name"

  # Open channel (retry around transient peer disconnects)
  local open_attempt
  local open_output=""
  for open_attempt in $(seq 1 $MAX_OPEN_CHANNEL_ATTEMPTS); do
    if has_channel_or_pending "$pubkey"; then
      echo "Channel to $name already exists after retry check, skipping."
      return 0
    fi

    if ! is_peer_connected "$pubkey"; then
      echo "Peer to $name disconnected before openchannel, reconnecting..."
      connect_main_to_peer "$pubkey" "$name" "$p2p_port" || true
      wait_for_peer_connected "$pubkey" "$name" || true
    fi

    echo "Opening channel: main LND → $name ($CHANNEL_CAPACITY_SATS sats) [attempt $open_attempt/$MAX_OPEN_CHANNEL_ATTEMPTS]..."
    open_output=$(lnd_cmd openchannel --node_key="$pubkey" --local_amt=$CHANNEL_CAPACITY_SATS 2>&1 || true)

    if [[ "$open_output" == *"funding_txid"* ]]; then
      echo "$open_output"
      echo "Channel to $name opened (pending confirmation)."
      return 0
    fi

    if has_channel_or_pending "$pubkey"; then
      echo "Channel to $name appears open/pending after openchannel response, continuing."
      return 0
    fi

    echo "openchannel attempt $open_attempt failed for $name."
    [ -n "$open_output" ] && echo "$open_output"

    if [ "$open_attempt" -lt "$MAX_OPEN_CHANNEL_ATTEMPTS" ]; then
      echo "Retrying openchannel after reconnect (${OPEN_CHANNEL_SLEEP}s)..."
      connect_main_to_peer "$pubkey" "$name" "$p2p_port" || true
      sleep $OPEN_CHANNEL_SLEEP
      continue
    fi

    echo "ERROR: Failed to open channel to $name after $MAX_OPEN_CHANNEL_ATTEMPTS attempts."
    echo "Peer snapshot:"
    lnd_cmd listpeers 2>/dev/null || true
    return 1
  done
}

# --- Main ---

echo "Provisioning LND recipient nodes (alice, bob, fee)..."

wait_for_node "$ALICE_CONTAINER" "alice"
wait_for_node "$BOB_CONTAINER" "bob"
wait_for_node "$FEE_CONTAINER" "fee"

echo ""
echo "Funding recipient nodes on-chain..."
fund_node "$ALICE_CONTAINER" "alice"
fund_node "$BOB_CONTAINER" "bob"
fund_node "$FEE_CONTAINER" "fee"

echo "Mining $CONFIRM_BLOCKS blocks to confirm funding..."
mine_blocks $CONFIRM_BLOCKS

echo ""
echo "Connecting and opening channels from main LND to recipient nodes..."
connect_and_open_channel "$ALICE_CONTAINER" "alice" "$ALICE_P2P_PORT"
echo "Mining $CONFIRM_BLOCKS blocks to confirm channel to alice..."
mine_blocks $CONFIRM_BLOCKS

connect_and_open_channel "$BOB_CONTAINER" "bob" "$BOB_P2P_PORT"
echo "Mining $CONFIRM_BLOCKS blocks to confirm channel to bob..."
mine_blocks $CONFIRM_BLOCKS

connect_and_open_channel "$FEE_CONTAINER" "fee" "$FEE_P2P_PORT"
echo "Mining $CONFIRM_BLOCKS blocks to confirm channels..."
mine_blocks $CONFIRM_BLOCKS

echo ""
echo "LND recipient nodes provisioned:"
echo "  alice pubkey: $(get_pubkey "$ALICE_CONTAINER")"
echo "  bob   pubkey: $(get_pubkey "$BOB_CONTAINER")"
echo "  fee   pubkey: $(get_pubkey "$FEE_CONTAINER")"
echo ""
