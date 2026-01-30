#!/bin/bash
# Podverse Development Setup
# Run from monorepo root

set -e

# Source nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "=== Podverse Development Setup ==="
echo ""

# Use correct Node version
echo "Setting Node version..."
nvm use

# Clean previous builds
echo "Cleaning previous builds..."
npm run clean --workspaces --if-present 2> /dev/null || true
rm -rf node_modules

# Install all dependencies
echo "Installing dependencies..."
npm install

# Build packages in dependency order
echo "Building packages..."
npm run build:packages

echo ""
echo "=== Setup Complete ==="
echo "Run 'npm run dev:api' or 'npm run dev:web' to start development"
