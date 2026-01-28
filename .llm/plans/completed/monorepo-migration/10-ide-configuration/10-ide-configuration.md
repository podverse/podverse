# Phase 10: IDE Configuration

**Status**: Completed

## Overview

Configure VS Code settings, extensions, and Terminals Manager for optimal monorepo development experience.

## Sub-Plans

This phase has been split into smaller plans that can run in parallel:

| Sub-Plan                                                                                                  | Description                                            | Status       |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------ |
| [10a-vscode-core.md](../../../completed/monorepo-migration/10-ide-configuration/10a-vscode-core.md)       | VS Code settings, extensions, launch, tasks, workspace | ✅ Completed |
| [10b-terminals-docs.md](../../../completed/monorepo-migration/10-ide-configuration/10b-terminals-docs.md) | Terminal configs and IDE documentation                 | ✅ Completed |

**Note**: `.vscode/terminals-rundev.json.example` was already created in Phase 6.

## VS Code Settings

**File**: `.vscode/settings.json`

```json
{
  // Editor
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },

  // TypeScript
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "typescript.tsdk": "node_modules/typescript/lib",

  // Search
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true,
    "**/coverage": true,
    "**/*.log": true
  },

  // Files
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": false
  },
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/.next/**": true
  },

  // ESLint
  "eslint.workingDirectories": [
    { "pattern": "packages/*" },
    { "pattern": "apps/*" },
    { "pattern": "tools/*" }
  ],

  // Terminal
  "terminal.integrated.cwd": "${workspaceFolder}",

  // Git
  "git.autofetch": true,
  "git.confirmSync": false,

  // Prettier (if used alongside ESLint)
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[markdown]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## Recommended Extensions

**File**: `.vscode/extensions.json`

```json
{
  "recommendations": [
    // Essential
    "fabiospampinato.vscode-terminals",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",

    // TypeScript
    "ms-vscode.vscode-typescript-next",

    // Git
    "eamodio.gitlens",
    "mhutchie.git-graph",

    // Productivity
    "christian-kohler.path-intellisense",
    "formulahendry.auto-rename-tag",
    "naumovs.color-highlight",

    // Docker
    "ms-azuretools.vscode-docker",

    // Database
    "ckolkman.vscode-postgres",

    // Markdown
    "yzhang.markdown-all-in-one",
    "bierner.markdown-mermaid"
  ],
  "unwantedRecommendations": []
}
```

## Terminals Manager Configuration

### Basic Terminal Layout

**File**: `.vscode/terminals.json.example`

```json
{
  "autorun": false,
  "terminals": [
    {
      "name": "Root",
      "description": "Monorepo root - run commands here",
      "cwd": ".",
      "open": true
    },
    {
      "name": "Git",
      "description": "Git operations",
      "cwd": ".",
      "open": true
    },
    {
      "name": "Docker",
      "description": "Docker commands",
      "cwd": ".",
      "open": true,
      "command": "docker ps"
    }
  ]
}
```

### Development Workflow

**File**: `.vscode/terminals-rundev.json.example`

(Full content in 06-local-dev-workflow.md)

### Services Only

**File**: `.vscode/terminals-services.json.example`

```json
{
  "autorun": false,
  "terminals": [
    {
      "name": "Database",
      "description": "PostgreSQL",
      "cwd": ".",
      "open": true,
      "command": "make local_db_up && docker logs -f podverse_local_db"
    },
    {
      "name": "Message Queue",
      "description": "RabbitMQ",
      "cwd": ".",
      "open": true,
      "command": "make local_mq_up && docker logs -f podverse_local_mq"
    },
    {
      "name": "Key-Value DB",
      "description": "Valkey/Redis",
      "cwd": ".",
      "open": true,
      "command": "make local_keyvaldb_up && docker logs -f podverse_local_keyvaldb"
    }
  ]
}
```

## Using Terminals Manager

### Installation

1. Install extension: `fabiospampinato.vscode-terminals`
2. Copy template: `cp .vscode/terminals-rundev.json.example .vscode/terminals.json`
3. Customize paths if needed

### Running Terminals

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type "Terminals: Run"
3. All configured terminals open with their commands

### Switching Configurations

```bash
# For development
cp .vscode/terminals-rundev.json.example .vscode/terminals.json

# For services only
cp .vscode/terminals-services.json.example .vscode/terminals.json
```

## Launch Configurations

**File**: `.vscode/launch.json`

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:watch"],
      "cwd": "${workspaceFolder}/apps/api",
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Debug Current File",
      "type": "node",
      "request": "launch",
      "program": "${file}",
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Jest Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["test", "--", "--runInBand"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ]
}
```

## Tasks Configuration

**File**: `.vscode/tasks.json`

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build All",
      "type": "npm",
      "script": "build",
      "group": "build",
      "problemMatcher": ["$tsc"]
    },
    {
      "label": "Build Packages",
      "type": "npm",
      "script": "build:packages",
      "group": "build",
      "problemMatcher": ["$tsc"]
    },
    {
      "label": "Lint",
      "type": "npm",
      "script": "lint",
      "group": "test",
      "problemMatcher": ["$eslint-stylish"]
    },
    {
      "label": "Type Check",
      "type": "npm",
      "script": "type-check",
      "group": "test",
      "problemMatcher": ["$tsc"]
    },
    {
      "label": "Start DB",
      "type": "shell",
      "command": "make local_db_up",
      "problemMatcher": []
    },
    {
      "label": "Start MQ",
      "type": "shell",
      "command": "make local_mq_up",
      "problemMatcher": []
    },
    {
      "label": "Start All Services",
      "type": "shell",
      "command": "make local_db_up && make local_mq_up && make local_keyvaldb_up",
      "problemMatcher": []
    }
  ]
}
```

## Workspace Settings

For multi-root workspace (if opening individual packages):

**File**: `podverse.code-workspace`

```json
{
  "folders": [
    { "path": ".", "name": "root" },
    { "path": "packages/helpers", "name": "helpers" },
    { "path": "packages/orm", "name": "orm" },
    { "path": "apps/api", "name": "api" },
    { "path": "apps/web", "name": "web" }
  ],
  "settings": {
    "typescript.tsdk": "node_modules/typescript/lib"
  }
}
```

## Documentation

### docs/IDE-SETUP.md

````markdown
# IDE Setup Guide

## VS Code (Recommended)

### Quick Start

1. Install VS Code
2. Open the podverse monorepo folder
3. Install recommended extensions (prompt appears)
4. Copy terminal config:
   ```bash
   cp .vscode/terminals-rundev.json.example .vscode/terminals.json
   ```
````

### Terminals Manager

The Terminals Manager extension opens multiple terminals with predefined commands.

1. Install extension: `fabiospampinato.vscode-terminals`
2. Command Palette > "Terminals: Run"

### Debugging

Use the launch configurations in `.vscode/launch.json`:

- Debug API: Launch API with debugger attached
- Debug Jest: Run tests with debugging

## Other IDEs

### WebStorm / IntelliJ

1. Open monorepo as project
2. Mark `node_modules` and `dist` as excluded
3. Configure Node.js interpreter to use `.nvmrc` version

### Cursor

Works same as VS Code. All `.vscode/` configurations apply.

```

## Files to Create

| File | Purpose |
|------|---------|
| `.vscode/settings.json` | Editor settings |
| `.vscode/extensions.json` | Extension recommendations |
| `.vscode/terminals.json.example` | Basic terminals |
| `.vscode/terminals-rundev.json.example` | Dev workflow terminals |
| `.vscode/terminals-services.json.example` | Services only |
| `.vscode/launch.json` | Debug configurations |
| `.vscode/tasks.json` | Build/lint tasks |
| `podverse.code-workspace` | Multi-root workspace |
| `docs/IDE-SETUP.md` | Setup documentation |

## Estimated Effort

~2-3 hours
```
