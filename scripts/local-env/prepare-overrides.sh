#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

OVERRIDES_DIR="dev/env-overrides/local"

mkdir -p "$OVERRIDES_DIR"

if ! ls "$OVERRIDES_DIR"/*.env.example >/dev/null 2>&1; then
  echo "No override example files found in $OVERRIDES_DIR"
  exit 1
fi

for example_file in "$OVERRIDES_DIR"/*.env.example; do
  target_file="${example_file%.example}"
  if [ ! -f "$target_file" ]; then
    cp "$example_file" "$target_file"
    echo "Created $target_file"
  fi
done

cat <<'EOF'

Override files are prepared in dev/env-overrides/local/.
Update those files with your private or external values, then run:

make local_env_setup
EOF
