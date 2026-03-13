#!/usr/bin/env bash
# Provisions the regtest after LND is up: sync chain, fund LND and CLN with 1 BTC each,
# open LND->CLN channel. Idempotent; prefers Nigiri CLI, fallback to docker exec.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
cd "$REPO_ROOT"

MAX_SYNC_ATTEMPTS=30
BLOCKS_PER_ROUND=10
FUND_AMOUNT_BTC=1
CONFIRM_BLOCKS=6
CHANNEL_CAPACITY_SATS=500000

# --- Helpers: Nigiri-first, then docker exec ---

bitcoin_rpc() {
  if nigiri rpc "$@" 2>/dev/null; then
    return 0
  fi
  docker exec bitcoin bitcoin-cli -regtest "$@"
}

# Generate n blocks; prefer generatetoaddress, fallback to deprecated generate
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
  if nigiri lnd "$@" 2>/dev/null; then
    return 0
  fi
  docker exec lnd lncli --network=regtest "$@"
}

cln_cmd() {
  if nigiri cln "$@" 2>/dev/null; then
    return 0
  fi
  # lightningd uses --lightning-dir=.lightning (CWD=/), so socket is at /.lightning/regtest/
  # lightning-cli defaults to $HOME/.lightning which is wrong; specify the correct path.
  docker exec cln lightning-cli --network=regtest --lightning-dir=/.lightning "$@"
}

# --- 1. Sync chain ---
sync_chain() {
  local i
  for i in $(seq 1 $MAX_SYNC_ATTEMPTS); do
    local info
    info=$(lnd_cmd getinfo 2>/dev/null | jq -r '.synced_to_chain, .block_height')
    local synced block_height
    synced=$(echo "$info" | head -1)
    block_height=$(echo "$info" | tail -1)
    if [ "$synced" = "true" ]; then
      echo "Chain synced."
      return 0
    fi
    local chain_blocks
    chain_blocks=$(bitcoin_rpc getblockchaininfo 2>/dev/null | jq -r '.blocks')
    if [ -z "$chain_blocks" ] || [ "$chain_blocks" = "null" ]; then
      echo "  Attempt $i/$MAX_SYNC_ATTEMPTS: Bitcoin RPC not ready, waiting..."
      sleep 2
      continue
    fi
    # Mine blocks whenever LND is not yet synced, regardless of relative heights.
    # LND may report block_height == chain_blocks but synced_to_chain: false when it has
    # not yet processed the latest block notification (common at genesis or after restart).
    # Mining a new block gives LND fresh chain tip data and clears the unsynced state.
    echo "  Attempt $i/$MAX_SYNC_ATTEMPTS: LND not synced (lnd=$block_height chain=$chain_blocks), mining blocks..."
    mine_blocks "$BLOCKS_PER_ROUND"
    sleep 2
  done
  echo "ERROR: Chain did not sync within $MAX_SYNC_ATTEMPTS attempts."
  return 1
}

# --- 2. Fund LND with 1 BTC ---
fund_lnd() {
  local total
  total=$(lnd_cmd walletbalance 2>/dev/null | jq -r '.total_balance // 0')
  if [ -n "$total" ] && [ "$total" != "null" ] && [ "${total:-0}" -gt 0 ]; then
    echo "LND already has balance, skipping."
    return 0
  fi
  if nigiri faucet lnd $FUND_AMOUNT_BTC 2>/dev/null; then
    echo "Funded LND with $FUND_AMOUNT_BTC BTC (faucet)."
  else
    echo "Funding LND with $FUND_AMOUNT_BTC BTC..."
    local addr
    addr=$(lnd_cmd newaddress p2wkh | jq -r '.address')
    bitcoin_rpc sendtoaddress "$addr" $FUND_AMOUNT_BTC >/dev/null
    mine_blocks $CONFIRM_BLOCKS
    echo "Funded LND with $FUND_AMOUNT_BTC BTC."
  fi
}

# --- 3. Fund CLN with 1 BTC ---
# CLN creates the lightning-rpc socket only after it has fully started. If we call lightning-cli
# before the socket exists, we get "Operation not supported". Wait for CLN RPC like we do for LND.
CLN_RPC_MAX_ATTEMPTS=60
CLN_RPC_SLEEP=2

wait_for_cln_rpc() {
  local i
  for i in $(seq 1 $CLN_RPC_MAX_ATTEMPTS); do
    if cln_cmd getinfo >/dev/null 2>&1; then
      return 0
    fi
    if [ "$i" -eq $CLN_RPC_MAX_ATTEMPTS ]; then
      echo "ERROR: CLN RPC did not become ready (lightning-rpc socket not available)."
      echo "  If 'docker logs cln' shows: lightningd: Binding rpc socket to 'lightning-rpc': Operation not supported"
      echo "  then lightningd cannot create the Unix socket in this environment (e.g. Docker on macOS with certain volume mounts)."
      echo "  Check: docker logs cln"
      echo "  See: https://github.com/ElementsProject/lightning/issues/4810"
      return 1
    fi
    echo "  Attempt $i/$CLN_RPC_MAX_ATTEMPTS: CLN RPC not ready (socket may not exist yet), waiting ${CLN_RPC_SLEEP}s..."
    sleep $CLN_RPC_SLEEP
  done
  return 1
}

fund_cln() {
  echo "Waiting for CLN RPC (lightning-rpc socket)..."
  wait_for_cln_rpc || return 1

  local funds total_sats
  funds=$(cln_cmd listfunds 2>/dev/null || echo '{"outputs":[]}')
  total_sats=$(echo "$funds" | jq -r '[.outputs[]? | .amount_msat // 0] | add // 0')
  if [ -n "$total_sats" ] && [ "$total_sats" != "null" ] && [ "${total_sats:-0}" -gt 0 ]; then
    echo "CLN already has funds, skipping."
    return 0
  fi
  if nigiri faucet cln $FUND_AMOUNT_BTC 2>/dev/null; then
    echo "Funded CLN with $FUND_AMOUNT_BTC BTC (faucet)."
  else
    echo "Funding CLN with $FUND_AMOUNT_BTC BTC..."
    local addr
    addr=$(cln_cmd newaddr bech32 | jq -r '.bech32')
    bitcoin_rpc sendtoaddress "$addr" $FUND_AMOUNT_BTC >/dev/null
    mine_blocks $CONFIRM_BLOCKS
    echo "Funded CLN with $FUND_AMOUNT_BTC BTC."
  fi
}

# --- 4. Connect LND to CLN and open/activate channel ---
MAX_PEER_ATTEMPTS=20
PEER_POLL_SLEEP=2
MAX_CHANNEL_ACTIVE_ATTEMPTS=30
CHANNEL_ACTIVE_SLEEP=2

# Ensure LND is connected to CLN as a peer. Idempotent (connect is no-op if already connected).
ensure_lnd_cln_connected() {
  echo "Ensuring LND is connected to CLN..."
  local i
  for i in $(seq 1 $MAX_PEER_ATTEMPTS); do
    if cln_cmd getinfo >/dev/null 2>&1; then
      break
    fi
    if [ "$i" -eq $MAX_PEER_ATTEMPTS ]; then
      echo "ERROR: CLN did not become ready."
      return 1
    fi
    echo "  Attempt $i/$MAX_PEER_ATTEMPTS: CLN not ready, waiting ${PEER_POLL_SLEEP}s..."
    sleep $PEER_POLL_SLEEP
  done

  local cln_id
  cln_id=$(cln_cmd getinfo | jq -r '.id')
  if [ -z "$cln_id" ] || [ "$cln_id" = "null" ]; then
    echo "ERROR: Could not get CLN node id."
    return 1
  fi
  CLN_NODE_ID="$cln_id"

  # Check if already connected
  if lnd_cmd listpeers 2>/dev/null | jq -e '.peers[] | select(.pub_key=="'"$cln_id"'")' >/dev/null 2>&1; then
    echo "LND already connected to CLN."
    return 0
  fi

  # CLN P2P can lag RPC; give it a moment before connect attempts
  sleep 3
  # Nigiri CLN uses --bind-addr=0.0.0.0:9935 (see docker-compose); host 9835 maps to container 9935
  echo "Connecting LND to CLN..."
  for i in $(seq 1 $MAX_PEER_ATTEMPTS); do
    if lnd_cmd connect "${cln_id}@cln:9935" 2>/dev/null; then
      break
    fi
    # "already connected" is not an error
    if lnd_cmd listpeers 2>/dev/null | jq -e '.peers[] | select(.pub_key=="'"$cln_id"'")' >/dev/null 2>&1; then
      break
    fi
    if [ "$i" -eq $MAX_PEER_ATTEMPTS ]; then
      echo "ERROR: Could not connect LND to CLN (connection refused to cln:9935)."
      return 1
    fi
    echo "  Attempt $i/$MAX_PEER_ATTEMPTS: connect refused, waiting ${PEER_POLL_SLEEP}s..."
    sleep $PEER_POLL_SLEEP
  done

  echo "Waiting for CLN peer to appear in LND listpeers..."
  for i in $(seq 1 $MAX_PEER_ATTEMPTS); do
    if lnd_cmd listpeers 2>/dev/null | jq -e '.peers[] | select(.pub_key=="'"$cln_id"'")' >/dev/null 2>&1; then
      echo "LND connected to CLN."
      return 0
    fi
    if [ "$i" -eq $MAX_PEER_ATTEMPTS ]; then
      echo "ERROR: CLN peer did not appear in LND listpeers."
      return 1
    fi
    echo "  Attempt $i/$MAX_PEER_ATTEMPTS: peer not in listpeers yet, waiting ${PEER_POLL_SLEEP}s..."
    sleep $PEER_POLL_SLEEP
  done
  return 1
}

# Wait for at least one channel to become active
wait_for_channel_active() {
  echo "Waiting for channel to become active..."
  local i
  for i in $(seq 1 $MAX_CHANNEL_ACTIVE_ATTEMPTS); do
    local active_count
    active_count=$(lnd_cmd listchannels 2>/dev/null | jq -r '[.channels[] | select(.active == true)] | length // 0')

    if [ -n "$active_count" ] && [ "$active_count" != "null" ] && [ "${active_count:-0}" -gt 0 ]; then
      echo "Channel is active."
      return 0
    fi
    if [ "$i" -eq $MAX_CHANNEL_ACTIVE_ATTEMPTS ]; then
      echo "WARNING: Channel did not become active within timeout. Payment may fail."
      return 1
    fi
    echo "  Attempt $i/$MAX_CHANNEL_ACTIVE_ATTEMPTS: no active channels yet, waiting ${CHANNEL_ACTIVE_SLEEP}s..."
    sleep $CHANNEL_ACTIVE_SLEEP
  done
  return 1
}

open_channel() {
  # Always ensure peer connection first (handles reconnection after CLN restart)
  ensure_lnd_cln_connected || return 1

  # Check if there's a channel specifically to CLN (by pubkey)
  # CLN_NODE_ID is set by ensure_lnd_cln_connected
  local cln_channel_count cln_channel_active orphaned_count
  cln_channel_count=$(lnd_cmd listchannels 2>/dev/null | jq -r '[.channels[] | select(.remote_pubkey=="'"$CLN_NODE_ID"'")] | length // 0')
  cln_channel_active=$(lnd_cmd listchannels 2>/dev/null | jq -r '[.channels[] | select(.remote_pubkey=="'"$CLN_NODE_ID"'" and .active == true)] | length // 0')
  orphaned_count=$(lnd_cmd listchannels 2>/dev/null | jq -r '[.channels[] | select(.remote_pubkey!="'"$CLN_NODE_ID"'" and .active == false and .uptime == "0")] | length // 0')

  # If we have a channel to the current CLN pubkey
  if [ -n "$cln_channel_count" ] && [ "$cln_channel_count" != "null" ] && [ "${cln_channel_count:-0}" -gt 0 ]; then
    if [ -n "$cln_channel_active" ] && [ "$cln_channel_active" != "null" ] && [ "${cln_channel_active:-0}" -gt 0 ]; then
      echo "LND already has active channel to CLN ($CLN_NODE_ID), skipping."
      return 0
    fi
    # Channel to current CLN exists but inactive — wait for it to activate
    echo "LND has channel to CLN but inactive. Waiting for activation after peer reconnection..."
    wait_for_channel_active
    return 0
  fi

  # No channel to current CLN — check if there are orphaned channels to old CLN pubkeys
  if [ -n "$orphaned_count" ] && [ "$orphaned_count" != "null" ] && [ "${orphaned_count:-0}" -gt 0 ]; then
    echo "WARNING: Found $orphaned_count orphaned channel(s) to old CLN pubkey(s)."
    echo "  CLN identity changed. Old channels will never activate."
    echo "  Opening new channel to current CLN ($CLN_NODE_ID)..."
  fi

  # No channel exists — open one
  echo "Opening LND->CLN channel..."
  lnd_cmd openchannel --node_key="$CLN_NODE_ID" --local_amt=$CHANNEL_CAPACITY_SATS
  mine_blocks $CONFIRM_BLOCKS
  echo "Channel opened."

  # Wait for the new channel to become active
  wait_for_channel_active
}

# --- Main ---
echo "Provisioning regtest (sync, fund 1 BTC each, open channel)..."
sync_chain
fund_lnd
fund_cln
open_channel
echo "Regtest provisioned."
