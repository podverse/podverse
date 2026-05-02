#!/usr/bin/env bash
# VERSION: 4
# GitOps helper: SOPS-encrypted Argo CD repository credentials (HTTPS GitHub + classic PAT).
# Run from your GitOps repository root next to ./secrets/ and .sops.yaml.
#
# Interactive: paste repo URL, confirm or override derived Secret name + output path, username, PAT.
#
# Canonical naming (accept defaults): Secret <slug>-repo-creds, file ./secrets/<slug>-argoc-repo.enc.yaml
# (<slug> from the github.com org/repo path). Deploy into namespace argocd only (Argo reads repo creds there).

set -euo pipefail

VERSION="4"

usage() {
  echo "Usage: $0" >&2
  echo "  Interactive prompts only. Run from GitOps repo root (.sops.yaml, ./secrets/)." >&2
  exit "${1:-1}"
}

if [[ $# -gt 0 ]]; then
  case "$1" in
    -h | --help)
      usage 0
      ;;
    *)
      echo "Error: unknown argument: $1 (this script has no flags; use --help)" >&2
      usage 1
      ;;
  esac
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command not found: $1" >&2
    exit 1
  fi
}

require_cmd kubectl
require_cmd sops
require_cmd yq

slug_from_github_https_url() {
  local url="$1"
  local path="${url#https://github.com/}"
  path="${path#http://github.com/}"
  path="${path%.git}"
  path="${path//\//-}"
  path="${path//./-}"
  path="$(echo "$path" | tr '[:upper:]' '[:lower:]')"
  echo "$path"
}

truncate_k8s_name() {
  local n="$1"
  local max="${2:-63}"
  if [[ ${#n} -gt "$max" ]]; then
    echo "${n:0:$max}"
  else
    echo "$n"
  fi
}

echo "Running $(basename "$0") - Version: ${VERSION}"
echo ""
echo "Enter the HTTPS GitHub repository URL Argo CD should clone (must match Application repoURL)."
echo "Example: https://github.com/org/private-gitops.git"
read -r -p "Repository URL: " REPO_URL
REPO_URL="$(echo "$REPO_URL" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
if [[ -z "$REPO_URL" ]]; then
  echo "Error: Repository URL is required." >&2
  exit 1
fi
if [[ "$REPO_URL" != https://github.com/* ]]; then
  echo "Error: Only https://github.com/... URLs are supported." >&2
  exit 1
fi

slug="$(slug_from_github_https_url "$REPO_URL")"
if [[ -z "$slug" ]]; then
  slug="gitops-repo"
fi
derived_secret="$(truncate_k8s_name "${slug}-repo-creds")"
derived_file="./secrets/${slug}-argoc-repo.enc.yaml"

echo ""
echo "Derived Kubernetes Secret name (override if you use a fixed legacy name): ${derived_secret}"
read -r -p "Secret name [${derived_secret}]: " SECRET_NAME_IN
SECRET_NAME="${SECRET_NAME_IN:-$derived_secret}"
SECRET_NAME="$(truncate_k8s_name "$SECRET_NAME")"

echo "Derived encrypted output path: ${derived_file}"
read -r -p "Output file [${derived_file}]: " OUTPUT_FILE_IN
OUTPUT_FILE="${OUTPUT_FILE_IN:-$derived_file}"

echo ""
echo "GitHub username for HTTPS basic auth (often your GitHub username):"
read -r GITHUB_USERNAME
if [[ -z "$GITHUB_USERNAME" ]]; then
  echo "Error: GitHub username is required." >&2
  exit 1
fi

echo ""
echo "Personal Access Token (classic) — Argo CD uses this as the Git HTTPS password."
echo "-------------------------------------------------------------------"
echo "Create it on GitHub.com:"
echo "  1) Profile (top right) → Settings → Developer settings"
echo "  2) Personal access tokens → Tokens (classic) → Generate new token (classic)"
echo "  3) Set a note (e.g. argocd-gitops-clone) and an expiration."
echo "  4) Check the \"repo\" scope (full control of private repositories) for cloning private repos over HTTPS."
echo "  5) Generate token and copy it now (GitHub shows it once)."
echo ""
echo "Organization + SAML SSO: after creation, in the token list use \"Configure SSO\""
echo "and Authorize for the organization that owns the repository."
echo ""
echo "Paste token (input hidden):"
read -rs GITHUB_TOKEN
echo ""

if [[ -z "$GITHUB_TOKEN" ]]; then
  echo "Error: GitHub PAT is required." >&2
  exit 1
fi

echo ""
echo "Namespace for the Secret (default: argocd):"
read -r NAMESPACE
NAMESPACE="${NAMESPACE:-argocd}"

TMP_FILE="$(mktemp "${TMPDIR:-/tmp}/argocd-repo-secret.XXXXXX.yaml")"
trap 'rm -f "$TMP_FILE"' EXIT

mkdir -p "$(dirname "$OUTPUT_FILE")"

echo "Generating Argo CD repository credentials manifest..."

kubectl create secret generic "${SECRET_NAME}" \
  --from-literal=url="${REPO_URL}" \
  --from-literal=username="${GITHUB_USERNAME}" \
  --from-literal=password="${GITHUB_TOKEN}" \
  --namespace "${NAMESPACE}" \
  --dry-run=client -o yaml |
  yq '.metadata.labels["argocd.argoproj.io/secret-type"] = "repository"' >"$TMP_FILE"

echo "Encrypting with SOPS to ${OUTPUT_FILE}..."

sops --encrypt --encrypted-regex '^(data|stringData)$' \
  "$TMP_FILE" >"${OUTPUT_FILE}"

echo "----------------------------------------------------"
echo "SUCCESS: Encrypted secret created at ${OUTPUT_FILE}"
echo "----------------------------------------------------"
echo "Apply:  sops -d ${OUTPUT_FILE} | kubectl apply -f -"
echo "Verify: sops -d ${OUTPUT_FILE}"
