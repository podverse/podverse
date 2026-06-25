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

# Return HTTP status from GHCR tags/list (200, 403, 404, ...).
podverse_ghcr_tags_http_status() {
  local repo="$1"
  local app="$2"
  local token="$3"
  curl -s -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer ${token}" \
    "https://ghcr.io/v2/${repo}/${app}/tags/list"
}

# Return 0 when GHCR tag listing works for at least one app image.
podverse_ghcr_tags_accessible() {
  local repo="$1"
  local token="$2"
  local status
  status=$(podverse_ghcr_tags_http_status "$repo" "api" "$token")
  [[ "$status" == "200" ]]
}

# Echo immutable staging git tag (e.g. 5.5.0-staging.0) for commit on GitHub repo.
podverse_git_staging_tag_for_commit() {
  local repo="$1"
  local commit_sha="$2"
  local base="$3"

  if ! command -v gh > /dev/null 2>&1; then
    return 1
  fi

  local ref tag
  ref=$(gh api "repos/${repo}/git/matching-refs/tags/${base}-staging" \
    --jq ".[] | select(.object.sha == \"${commit_sha}\") | .ref" 2> /dev/null | head -1)
  if [[ -z "$ref" ]]; then
    return 1
  fi
  tag="${ref#refs/tags/}"
  printf '%s' "$tag"
}

# Echo min staging N for base X.Y.Z (same logic as publish-main.yml). Exit 1 if any app missing.
podverse_min_staging_n() {
  local repo="$1"
  local base="$2"
  local token="$3"
  local prefix="${base}-staging."
  local mins=()
  local app tags_json best t n m status

  for app in "${PODVERSE_GHCR_APPS[@]}"; do
    status=$(podverse_ghcr_tags_http_status "$repo" "$app" "$token")
    if [[ "$status" != "200" ]]; then
      echo "ERROR: GHCR tags/list for ${repo}/${app} returned HTTP ${status}" >&2
      return 1
    fi
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
  local tags_json status

  status=$(podverse_ghcr_tags_http_status "$repo" "$app" "$token")
  if [[ "$status" != "200" ]]; then
    return 1
  fi
  tags_json=$(curl -fsS -H "Authorization: Bearer ${token}" \
    "https://ghcr.io/v2/${repo}/${app}/tags/list")
  echo "$tags_json" | jq -e --arg T "$tag" '.tags | index($T)' > /dev/null
}
