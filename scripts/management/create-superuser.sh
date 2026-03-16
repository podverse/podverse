#!/bin/bash
set -e

# Ensure required env vars exist
: "${MANAGEMENT_SUPERUSER_EMAIL:?Missing MANAGEMENT_SUPERUSER_EMAIL}"
: "${MANAGEMENT_SUPERUSER_PASSWORD:?Missing MANAGEMENT_SUPERUSER_PASSWORD}"

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to script directory
cd "$SCRIPT_DIR"

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install --silent
fi

# Export environment variables needed by the Node.js script
export DB_HOST="${DB_HOST:-localhost}"
export DB_PORT="${DB_PORT:-5432}"
export DB_DATABASE="${DB_DATABASE:-${POSTGRES_MANAGEMENT_DB:-podverse_management}}"
export POSTGRES_USER="${POSTGRES_USER:-${POSTGRES_MANAGEMENT_USER:-postgres_user_management}}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-${POSTGRES_MANAGEMENT_PASSWORD:-}}"

# Run the Node.js script
node create-superuser.mjs
