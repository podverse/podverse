#!/usr/bin/env bash
# Convenience wrapper — canonical script: infra/k8s/base/ops/source/database/runner/run-linear-migrations.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/../../infra/k8s/base/ops/source/database/runner/run-linear-migrations.sh" "$@"
