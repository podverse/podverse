#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MGMT_SU_DIR="$(cd "$SCRIPT_DIR/../../infra/k8s/base/ops/source/database/management-superuser" && pwd)"
cd "$MGMT_SU_DIR"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install --silent
fi

node update-superuser.mjs "$@"
