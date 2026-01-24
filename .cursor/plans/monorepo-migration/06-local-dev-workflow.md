# Phase 6: Local Development Workflow

**Status**: Planned

## Overview

Replace the multi-repo npm link workflow with npm workspaces. Maintain the same developer experience using Terminals Manager.

## npm Workspaces vs npm Link

### Before (Multi-Repo)

From `npm-link-modules.sh`:
1. `npm link` each package globally
2. `npm link <package-name>` in each consumer
3. Build each package in dependency order
4. Fragile symlinks, version mismatches

### After (Monorepo)

```json
// packages/external-services/package.json
{
  "dependencies": {
    "@podverse/helpers": "workspace:*"
  }
}
```

Benefits:
- Single `npm install` at root
- Automatic local resolution
- No symlink management
- Version always in sync

## Setup Script

**File**: `scripts/dev/setup.sh`

```bash
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
npm run clean --workspaces --if-present 2>/dev/null || true
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
```

## Terminals Manager Configuration

**File**: `.vscode/terminals-rundev.json.example`

Adapted from `podverse-ops/.vscode/terminals-rundev.json.example` for monorepo paths:

```json
{
  "autorun": false,
  "terminals": [
    {
      "name": "Root",
      "description": "Monorepo root",
      "cwd": ".",
      "open": true
    },
    {
      "name": "helpers",
      "description": "@podverse/helpers",
      "cwd": "packages/helpers",
      "open": true,
      "command": "sleep 2 && npm run build:watch"
    },
    {
      "name": "external-services",
      "description": "@podverse/external-services",
      "cwd": "packages/external-services",
      "open": true,
      "command": "sleep 4 && npm run build:watch"
    },
    {
      "name": "notifications",
      "description": "@podverse/notifications",
      "cwd": "packages/notifications",
      "open": true,
      "command": "sleep 6 && npm run build:watch"
    },
    {
      "name": "orm",
      "description": "@podverse/orm",
      "cwd": "packages/orm",
      "open": true,
      "command": "sleep 8 && npm run build:watch"
    },
    {
      "name": "parser",
      "description": "@podverse/parser",
      "cwd": "packages/parser",
      "open": true,
      "command": "sleep 10 && npm run build:watch"
    },
    {
      "name": "mq",
      "description": "@podverse/mq",
      "cwd": "packages/mq",
      "open": true,
      "command": "sleep 12 && npm run build:watch"
    },
    {
      "name": "api",
      "description": "podverse-api",
      "cwd": "apps/api",
      "open": true,
      "command": "sleep 14 && npm run dev:watch"
    },
    {
      "name": "web",
      "description": "podverse-web",
      "cwd": "apps/web",
      "open": true,
      "command": "sleep 16 && npm run dev"
    },
    {
      "name": "workers",
      "description": "podverse-workers",
      "cwd": "apps/workers",
      "open": true
    },
    {
      "name": "management-api",
      "description": "podverse-management-api",
      "cwd": "apps/management-api",
      "open": true
    },
    {
      "name": "management-web",
      "description": "podverse-management-web",
      "cwd": "apps/management-web",
      "open": true
    },
    {
      "name": "qa",
      "description": "podverse-qa",
      "cwd": "tools/qa",
      "open": true
    }
  ]
}
```

## Staggered Build Timing

The `sleep N` delays ensure packages build in dependency order:

| Delay | Package | Depends On |
|-------|---------|------------|
| 2s | helpers | (none) |
| 4s | external-services | helpers |
| 6s | notifications | helpers, external-services |
| 8s | orm | helpers |
| 10s | parser | helpers, external-services, orm, notifications |
| 12s | mq | helpers, external-services, orm, parser |
| 14s | api | all packages |
| 16s | web | helpers |

## Common Development Tasks

### Initial Setup

```bash
# Clone and setup
git clone https://github.com/podverse/podverse.git
cd podverse
./scripts/dev/setup.sh
```

### Daily Development

```bash
# Start required services
make local_db_up
make local_mq_up

# Open VS Code with terminals
code .
# Command Palette > Terminals: Run (using terminals-rundev.json)
```

### Running Individual Apps

```bash
# From monorepo root
npm run dev:api
npm run dev:web
npm run dev:management-api
npm run dev:management-web
```

### Building Everything

```bash
npm run build           # All packages and apps
npm run build:packages  # Just packages (in order)
npm run build:apps      # Just apps
```

### Cleaning

```bash
npm run clean           # Remove all dist/ directories
rm -rf node_modules     # Full reset
npm install             # Reinstall
```

## Package Scripts

Each package should have these standard scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "clean": "rm -rf dist",
    "lint": "eslint src",
    "type-check": "tsc --noEmit"
  }
}
```

Apps may have additional scripts:

```json
{
  "scripts": {
    "dev": "next dev",           // web apps
    "dev:watch": "nodemon",      // api apps
    "build:dev": "tsc",
    "build:prod": "tsc -p tsconfig.prod.json"
  }
}
```

## Troubleshooting

### "Cannot find module @podverse/helpers"

```bash
# Ensure packages are built
npm run build:packages
```

### "Wrong version of dependency"

```bash
# Clean and reinstall
rm -rf node_modules
npm install
```

### "Build order issues"

```bash
# Build packages explicitly in order
npm run build -w packages/helpers
npm run build -w packages/external-services
# ... etc
```

## Files to Create

| File | Purpose |
|------|---------|
| `scripts/dev/setup.sh` | Initial development setup |
| `.vscode/terminals-rundev.json.example` | Terminals Manager config |

## Estimated Effort

~2-3 hours
