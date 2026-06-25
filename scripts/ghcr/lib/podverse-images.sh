#!/usr/bin/env bash
# Shared Podverse GHCR image list and staging-line selection (matches publish-main.yml).

PODVERSE_GHCR_APPS=(
  web-base
  management-web-base
  api
  workers
  management-api
  web-deploy
  management-web-deploy
  web-runtime-config
  management-web-runtime-config
  extension-prometheus
)

# Resolve GHCR Bearer token: GHCR_REGISTRY_TOKEN, else gh auth token.
podverse_ghcr_bearer_token() {
  if [[ -n "${GHCR_REGISTRY_TOKEN:-}" ]]; then
    printf '%s' "$GHCR_REGISTRY_TOKEN"
    return 0
  fi
  if command -v gh > /dev/null 2>&1; then
    gh auth token 2> /dev/null || true
    return 0
  fi
  return 1
}

# Echo min staging N for base X.Y.Z (same logic as publish-main.yml). Exit 1 if any app missing.
podverse_min_staging_n() {
  local repo="$1"
  local base="$2"
  local token="$3"
  local prefix="${base}-staging."
  local mins=()
  local app tags_json best t n m

  for app in "${PODVERSE_GHCR_APPS[@]}"; do
    tags_json=$(curl -fsS -H "Authorization: Bearer ${token}" \
      "https://ghcr.io/v2/${repo}/${app}/tags/list")
    best=-1
    while IFS= read -r t; do
      case "$t" in
        "${prefix}"*)
          n="${t#${prefix}}"
          if [[ "$n" =~ ^[0-9]+$ ]] && [[ "$n" -gt "$best" ]]; then
            best="$n"
          fi
          ;;
      esac
    done < <(echo "$tags_json" | jq -r '.tags[]? // empty' | tr -d '\r')
    if [[ "$best" -lt 0 ]]; then
      echo "ERROR: No ${base}-staging.N tag for ${repo}/${app}" >&2
      return 1
    fi
    mins+=("$best")
  done

  m=$(printf '%s\n' "${mins[@]}" | sort -n | head -1)
  echo "$m"
}

# Return 0 when image has tag in GHCR.
podverse_ghcr_has_tag() {
  local repo="$1"
  local app="$2"
  local tag="$3"
  local token="$4"
  local tags_json

  tags_json=$(curl -fsS -H "Authorization: Bearer ${token}" \
    "https://ghcr.io/v2/${repo}/${app}/tags/list")
  echo "$tags_json" | jq -e --arg T "$tag" '.tags | index($T)' > /dev/null
}
