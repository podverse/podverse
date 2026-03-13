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

cat <<EOF

Override files are in $HOME_OVERRIDES_DIR.
Edit those files with your private or external values, then run:

  make local_env_link
  make local_env_setup

Link makes the repo use these files; setup generates app and infra env from them.
EOF
