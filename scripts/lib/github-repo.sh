#!/usr/bin/env bash
# Resolve GitHub owner/repo from git origin (no gh repo set-default required).

podverse_github_repo_from_origin() {
  local url
  url=$(git remote get-url origin 2> /dev/null) || return 1

  local repo=""
  if [[ "$url" =~ ^git@github\.com:(.+)$ ]]; then
    repo="${BASH_REMATCH[1]}"
  elif [[ "$url" =~ ^ssh://git@github\.com/(.+)$ ]]; then
    repo="${BASH_REMATCH[1]}"
  elif [[ "$url" =~ github\.com/([^/]+/[^/?#]+) ]]; then
    repo="${BASH_REMATCH[1]}"
  fi

  repo="${repo%.git}"
  if [[ -z "$repo" || "$repo" != */* ]]; then
    return 1
  fi

  printf '%s' "$repo"
}
