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
  docker exec cln lightning-cli --network=regtest "$@"
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
fund_cln() {
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

# --- 4. Connect LND to CLN and open channel ---
MAX_PEER_ATTEMPTS=20
PEER_POLL_SLEEP=2

open_channel() {
  local channels
  channels=$(lnd_cmd listchannels 2>/dev/null | jq -r '.channels | length // 0')
  if [ -n "$channels" ] && [ "$channels" != "null" ] && [ "${channels:-0}" -gt 0 ]; then
    echo "LND already has channel(s), skipping."
    return 0
  fi
  echo "Waiting for CLN to be ready..."
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
  # CLN P2P can lag RPC; give it a moment before connect attempts
  sleep 5
  # Nigiri CLN uses --bind-addr=0.0.0.0:9935 (see docker-compose); host 9835 maps to container 9935
  echo "Connecting LND to CLN..."
  local connected=
  for i in $(seq 1 $MAX_PEER_ATTEMPTS); do
    if lnd_cmd connect "${cln_id}@cln:9935" 2>/dev/null; then
      connected=1
      break
    fi
    if [ "$i" -eq $MAX_PEER_ATTEMPTS ]; then
      echo "ERROR: Could not connect LND to CLN (connection refused to cln:9935)."
      return 1
    fi
    echo "  Attempt $i/$MAX_PEER_ATTEMPTS: connect refused, waiting ${PEER_POLL_SLEEP}s..."
    sleep $PEER_POLL_SLEEP
  done
  [ -n "${connected:-}" ] || return 1
  echo "Waiting for CLN peer to appear in LND listpeers..."
  for i in $(seq 1 $MAX_PEER_ATTEMPTS); do
    if lnd_cmd listpeers 2>/dev/null | jq -e '.peers[] | select(.pub_key=="'"$cln_id"'")' >/dev/null 2>&1; then
      break
    fi
    if [ "$i" -eq $MAX_PEER_ATTEMPTS ]; then
      echo "ERROR: CLN peer did not appear in LND listpeers."
      return 1
    fi
    echo "  Attempt $i/$MAX_PEER_ATTEMPTS: peer not in listpeers yet, waiting ${PEER_POLL_SLEEP}s..."
    sleep $PEER_POLL_SLEEP
  done
  echo "Opening LND->CLN channel..."
  lnd_cmd openchannel --node_key="$cln_id" --local_amt=$CHANNEL_CAPACITY_SATS
  mine_blocks $CONFIRM_BLOCKS
  echo "Channel opened."
}

# --- Main ---
echo "Provisioning regtest (sync, fund 1 BTC each, open channel)..."
sync_chain
fund_lnd
fund_cln
open_channel
echo "Regtest provisioned."
