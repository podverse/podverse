#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

OVERRIDES_DIR="dev/env-overrides/local"

# Default: XDG-style path; override with PODVERSE_HOME_OVERRIDES_DIR
if [ -n "${PODVERSE_HOME_OVERRIDES_DIR:-}" ]; then
  HOME_OVERRIDES_RAW="$PODVERSE_HOME_OVERRIDES_DIR"
else
  HOME_OVERRIDES_RAW="${HOME:-}/.config/podverse/local-env-overrides"
fi

# Expand leading ~ to $HOME for override path
HOME_OVERRIDES_EXPANDED="${HOME_OVERRIDES_RAW/#\~/$HOME}"
# Create directory if needed, then resolve to absolute path so symlinks work from any cwd
mkdir -p "$HOME_OVERRIDES_EXPANDED"
HOME_OVERRIDES_DIR="$(cd "$HOME_OVERRIDES_EXPANDED" && pwd)"

if ! ls "$OVERRIDES_DIR"/*.env.example >/dev/null 2>&1; then
  echo "No override example files found in $OVERRIDES_DIR"
  echo "Run this script from the Podverse repo root."
  exit 1
fi

mkdir -p "$OVERRIDES_DIR"
mkdir -p "$HOME_OVERRIDES_DIR"

# Get value of VAR from env file (trimmed, no quotes); empty if missing
get_var() {
  local file="$1" var="$2" line val
  [ -f "$file" ] || return 0
  line="$(grep -E "^${var}=" "$file" 2>/dev/null | head -n 1 || true)"
  [ -n "$line" ] || return 0
  val="${line#*=}"
  val="${val%\"}"; val="${val#\"}"; val="${val%\'}"; val="${val#\'}"
  printf '%s' "$val"
}

for example_file in "$OVERRIDES_DIR"/*.env.example; do
  [ -f "$example_file" ] || continue
  base_name="${example_file##*/}"
  target_name="${base_name%.example}"
  home_file="$HOME_OVERRIDES_DIR/$target_name"
  repo_file="$OVERRIDES_DIR/$target_name"

  # Bootstrap home file from example if missing; use repo's real override if present so secrets carry over
  if [ ! -f "$home_file" ]; then
    if [ -f "$repo_file" ] && [ ! -L "$repo_file" ]; then
      cp "$repo_file" "$home_file"
      echo "Created $home_file (from repo override)"
    else
      cp "$example_file" "$home_file"
      echo "Created $home_file (from example)"
    fi
  fi

  # Sync repo -> home when home exists but looks like example (e.g. ADD_BY_RSS key empty); then point repo at home
  if [ -f "$home_file" ] && [ "$target_name" = "add-by-rss.env" ]; then
    home_val="$(get_var "$home_file" "ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY")"
    if [ -z "$home_val" ] && [ -f "$repo_file" ] && [ ! -L "$repo_file" ]; then
      repo_val="$(get_var "$repo_file" "ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY")"
      if [ -n "$repo_val" ]; then
        cp "$repo_file" "$home_file"
        echo "Synced $home_file from repo"
        rm -f "$repo_file"
        ln -s "$home_file" "$repo_file"
        echo "Linked $repo_file -> $home_file"
      fi
    fi
  fi

  # Create symlink in repo only if repo file is missing (do not overwrite existing)
  if [ ! -e "$repo_file" ]; then
    ln -s "$home_file" "$repo_file"
    echo "Linked $repo_file -> $home_file"
  fi
done

echo ""
echo "Local overrides are linked from $HOME_OVERRIDES_DIR"
echo "Edit files there; they apply to this and all other work trees."
echo "Then run: make local_env_setup"
