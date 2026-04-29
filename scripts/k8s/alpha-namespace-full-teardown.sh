#!/usr/bin/env bash
#
# Interactive, safety-first teardown for podverse-alpha (or same-layout namespaces).
# See: docs/development/k8s/ALPHA-NAMESPACE-FULL-TEARDOWN.md
#
# Usage:
#   ./scripts/k8s/alpha-namespace-full-teardown.sh
#   ./scripts/k8s/alpha-namespace-full-teardown.sh --dry-run
#   ./scripts/k8s/alpha-namespace-full-teardown.sh -y
#
# Requires: kubectl (optional: ripgrep for faster filters; grep -F is the fallback)
#
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DRY_RUN=0
AUTO_YES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -y | --yes)
      AUTO_YES=1
      shift
      ;;
    -h | --help)
      head -n 18 "$0"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}" >&2
      exit 1
      ;;
  esac
done

filter_lines_containing() {
  local needle="$1"
  if command -v rg &>/dev/null; then
    rg -F -- "$needle"
  else
    grep -F -- "$needle"
  fi
}

prompt_yes() {
  local prompt="$1"
  if [[ "$AUTO_YES" -eq 1 ]]; then
    return 0
  fi
  local ans=""
  read -r -p "${prompt} [y/N]: " ans || return 1
  case "$(echo "$ans" | tr '[:upper:]' '[:lower:]')" in
    y | yes) return 0 ;;
    *) return 1 ;;
  esac
}

confirm_exact_phrase() {
  local phrase="$1"
  local extra="${2:-}"
  if [[ "$AUTO_YES" -eq 1 ]]; then
    echo -e "${YELLOW}Auto-yes: skipping typed confirmation for: ${phrase}${NC}"
    return 0
  fi
  local typed=""
  read -r -p "${extra}Type \"${phrase}\" to confirm: " typed || exit 1
  if [[ "$typed" != "$phrase" ]]; then
    echo -e "${RED}Confirmation mismatch. Aborting.${NC}" >&2
    exit 1
  fi
}

gate_cluster_identity() {
  echo -e "${YELLOW}--- Cluster identity gate ---${NC}"
  local current
  current="$(kubectl config current-context)"
  if [[ "$current" != "$EXPECTED_CONTEXT" ]]; then
    echo -e "${RED}Context mismatch: got \"${current}\", expected \"${EXPECTED_CONTEXT}\"${NC}" >&2
    exit 1
  fi
  local server
  server="$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')"
  echo "Current context: $current"
  echo "API server:     $server"
  if ! echo "$server" | grep -Fq -- "$EXPECTED_SERVER_FRAGMENT"; then
    echo -e "${RED}Server URL does not contain expected fragment: ${EXPECTED_SERVER_FRAGMENT}${NC}" >&2
    exit 1
  fi
  echo -e "${GREEN}Gate passed.${NC}"
}

ensure_namespaces_exist() {
  local ns
  for ns in "${NAMESPACES[@]}"; do
    if ! kubectl get namespace "$ns" &>/dev/null; then
      echo -e "${RED}Namespace \"${ns}\" does not exist on this cluster. Refusing to continue.${NC}" >&2
      exit 1
    fi
  done
  echo -e "${GREEN}Namespace(s) present: ${NAMESPACES[*]}${NC}"
}

run_inventory() {
  echo -e "${YELLOW}--- Pre-delete inventory (read-only) ---${NC}"
  local ns
  for ns in "${NAMESPACES[@]}"; do
    echo "===== ${ns} ====="
    kubectl --request-timeout=10s -n "$ns" get all,ingress,pvc,cm,secret,job,cronjob 2>/dev/null || true
  done
  echo "===== PVs (matching pattern) ====="
  kubectl --request-timeout=10s get pv -o wide 2>/dev/null | filter_lines_containing "$TARGET_PATTERN" || true
  echo "===== Argo CD applications (matching pattern) ====="
  kubectl --request-timeout=10s -n argocd get applications 2>/dev/null | filter_lines_containing "$TARGET_PATTERN" || true
}

delete_argo_applications() {
  echo -e "${YELLOW}--- Delete Argo CD Applications (${TARGET_PATTERN}-<component>) ---${NC}"
  local components=(
    management-web
    web
    cron
    workers
    management-api
    api
    ops
    mq
    keyvaldb
    db
    common
  )
  local c
  for c in "${components[@]}"; do
    local name="${TARGET_PATTERN}-${c}"
    echo "Deleting application: ${name}"
    kubectl -n argocd delete application "$name" --ignore-not-found=true --wait=false
  done
  echo "Waiting briefly for Application CRs to settle..."
  sleep 3
  kubectl -n argocd get applications 2>/dev/null | filter_lines_containing "$TARGET_PATTERN" || true
}

delete_namespaces() {
  echo -e "${YELLOW}--- Delete namespace(s) ---${NC}"
  local ns
  for ns in "${NAMESPACES[@]}"; do
    echo "kubectl delete namespace ${ns} --wait=false"
    kubectl delete namespace "$ns" --wait=false
  done
}

verify_final() {
  echo -e "${YELLOW}--- Final verification ---${NC}"
  kubectl get ns 2>/dev/null | filter_lines_containing "$TARGET_PATTERN" || echo "(no matching namespaces)"
  kubectl -n argocd get applications 2>/dev/null | filter_lines_containing "$TARGET_PATTERN" || echo "(no matching applications)"
  kubectl get pv -o wide 2>/dev/null | filter_lines_containing "$TARGET_PATTERN" || echo "(no matching PV rows)"
}

optional_pv_cleanup() {
  echo -e "${YELLOW}--- Optional PV cleanup ---${NC}"
  local pv_block
  pv_block="$(kubectl get pv -o wide 2>/dev/null | filter_lines_containing "$TARGET_PATTERN" || true)"
  if [[ -z "$(echo "$pv_block" | tr -d '[:space:]')" ]]; then
    echo "(No PV rows match pattern — skip PV deletion.)"
    return 0
  fi
  echo "$pv_block"
  if ! prompt_yes "Delete specific PVs now? (inspect reclaim policy and cloud disks before confirming)"; then
    echo "Skipping PV deletion. Remove retained disks in your cloud provider if needed."
    return 0
  fi
  local list=""
  read -r -p "Enter PV names to delete (space-separated): " list || true
  list="${list//,/ }"
  if [[ -z "$(echo "$list" | tr -d '[:space:]')" ]]; then
    echo "No PV names entered."
    return 0
  fi
  confirm_exact_phrase 'DELETE PVS' ''
  # shellcheck disable=SC2086
  kubectl delete pv $list
}

main() {
  echo -e "${YELLOW}Alpha namespace full teardown (interactive)${NC}"
  echo "Recommended: remove or disable matching Application manifests in GitOps, push, let Argo reconcile, then run this script."
  echo ""

  local EXPECTED_CONTEXT=""
  while [[ -z "$EXPECTED_CONTEXT" ]]; do
    read -r -p "Expected kubectl context (exact): " EXPECTED_CONTEXT || exit 1
    if [[ -z "$EXPECTED_CONTEXT" ]]; then
      echo -e "${RED}Context cannot be empty.${NC}" >&2
    fi
  done

  local EXPECTED_SERVER_FRAGMENT=""
  while [[ -z "$EXPECTED_SERVER_FRAGMENT" ]]; do
    read -r -p "Expected API server URL substring (unique fragment): " EXPECTED_SERVER_FRAGMENT || exit 1
    if [[ -z "$EXPECTED_SERVER_FRAGMENT" ]]; then
      echo -e "${RED}Fragment cannot be empty.${NC}" >&2
    fi
  done

  local TARGET_PATTERN=""
  read -r -p "Target pattern (Argo app prefix = <pattern>-<component>) [podverse-alpha]: " TARGET_PATTERN || exit 1
  if [[ -z "$TARGET_PATTERN" ]]; then
    TARGET_PATTERN='podverse-alpha'
  fi

  local ns_input=""
  read -r -p "Namespace(s) to delete (space or comma-separated) [${TARGET_PATTERN}]: " ns_input || exit 1
  ns_input="${ns_input//,/ }"
  if [[ -z "$(echo "$ns_input" | tr -d '[:space:]')" ]]; then
    ns_input="$TARGET_PATTERN"
  fi
  read -r -a NAMESPACES <<< "$ns_input"

  echo ""
  echo "Summary:"
  echo "  Context:         ${EXPECTED_CONTEXT}"
  echo "  Server contains: ${EXPECTED_SERVER_FRAGMENT}"
  echo "  App prefix:      ${TARGET_PATTERN}-"
  echo "  Namespace(s):    ${NAMESPACES[*]}"
  echo ""

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo -e "${YELLOW}--dry-run: gates + inventory only.${NC}"
    gate_cluster_identity
    ensure_namespaces_exist
    run_inventory
    echo -e "${GREEN}Dry run complete.${NC}"
    exit 0
  fi

  if ! prompt_yes "Proceed with identity gate and inventory?"; then
    echo "Aborted."
    exit 0
  fi

  gate_cluster_identity
  ensure_namespaces_exist
  run_inventory

  if ! prompt_yes "Continue to DELETE Argo CD applications ${TARGET_PATTERN}-* ?"; then
    echo "Stopped after inventory."
    exit 0
  fi
  gate_cluster_identity
  confirm_exact_phrase 'DELETE ARGO' 'This removes Argo CD Application CRs. '
  delete_argo_applications

  gate_cluster_identity
  echo -e "${RED}Next step deletes namespace(s): ${NAMESPACES[*]}${NC}"
  confirm_exact_phrase 'DELETE NAMESPACES' 'This is destructive. '
  delete_namespaces

  echo "Namespace delete requested (async). Check with: kubectl get ns | grep -F ${TARGET_PATTERN} || true"
  optional_pv_cleanup
  verify_final
  echo -e "${GREEN}Teardown script finished. Verify cloud disks or snapshots if storage uses Retain.${NC}"
}

main "$@"
