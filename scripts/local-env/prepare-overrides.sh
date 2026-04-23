#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

OVERRIDES_DIR="dev/env-overrides/local"

# Same home path as link-overrides.sh; override with PODVERSE_HOME_OVERRIDES_DIR
if [ -n "${PODVERSE_HOME_OVERRIDES_DIR:-}" ]; then
  HOME_OVERRIDES_RAW="$PODVERSE_HOME_OVERRIDES_DIR"
else
  HOME_OVERRIDES_RAW="${HOME:-}/.config/podverse/local-env-overrides"
fi
HOME_OVERRIDES_EXPANDED="${HOME_OVERRIDES_RAW/#\~/$HOME}"
mkdir -p "$HOME_OVERRIDES_EXPANDED"
HOME_OVERRIDES_DIR="$(cd "$HOME_OVERRIDES_EXPANDED" && pwd)"

home_has_assignment_for_key() {
  local home_file="$1" key="$2"
  [ -f "$home_file" ] || return 1
  grep -q -E "^${key}=" "$home_file" 2>/dev/null
}

# Append lines from example for keys missing from home_file (same rule as Metaboost prepare:
# existing KEY= lines are never changed).
merge_missing_keys_from_example() {
  local example_file="$1" home_file="$2"
  local line key lastc need_nl=0

  if [ -s "$home_file" ]; then
    lastc=$(tail -c1 "$home_file" || true)
    if [ -n "$lastc" ] && [ "$lastc" != $'\n' ]; then
      need_nl=1
    fi
  fi

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|\#*) continue ;;
    esac
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)= ]]; then
      key="${BASH_REMATCH[1]}"
      if ! home_has_assignment_for_key "$home_file" "$key"; then
        if [ "$need_nl" -eq 1 ]; then
          printf '\n' >>"$home_file"
          need_nl=0
        fi
        printf '%s\n' "$line" >>"$home_file"
        echo "Merged missing key ${key} into ${home_file}"
      fi
    fi
  done <"$example_file"
}

if ! ls "$OVERRIDES_DIR"/*.env.example >/dev/null 2>&1; then
  echo "No override example files found in $OVERRIDES_DIR"
  echo "Run this script from the Podverse repo root."
  exit 1
fi

for example_file in "$OVERRIDES_DIR"/*.env.example; do
  [ -f "$example_file" ] || continue
  base_name="${example_file##*/}"
  target_name="${base_name%.example}"
  home_file="$HOME_OVERRIDES_DIR/$target_name"
  if [ ! -f "$home_file" ]; then
    cp "$example_file" "$home_file"
    echo "Created $home_file"
  fi
done

for example_file in "$OVERRIDES_DIR"/*.env.example; do
  [ -f "$example_file" ] || continue
  base_name="${example_file##*/}"
  target_name="${base_name%.example}"
  home_file="$HOME_OVERRIDES_DIR/$target_name"
  [ -f "$home_file" ] || continue
  merge_missing_keys_from_example "$example_file" "$home_file"
done

cat <<EOF

Override files are in $HOME_OVERRIDES_DIR.
Edit those files with your private or external values, then run:

  make local_env_link
  make local_env_setup

Link makes the repo use these files; setup generates app and infra env from them.
EOF
