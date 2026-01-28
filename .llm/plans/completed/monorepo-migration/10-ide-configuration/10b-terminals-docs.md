# Phase 10B: Terminal Configs & Documentation

**Status**: Completed
**Estimated Effort**: 1 hour

## Overview

Create additional Terminals Manager configurations and IDE setup documentation.

## Prerequisites

- Phase 1 infrastructure complete ✅
- `.vscode/terminals-rundev.json.example` already exists ✅

## Files to Create

### 1. `.vscode/terminals.json.example`

Basic terminal layout for general development:

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

### 2. `.vscode/terminals-services.json.example`

Services-only configuration for running infrastructure:

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

### 3. `docs/IDE-SETUP.md`

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

### Recommended Extensions

When you open the project, VS Code will prompt you to install recommended extensions. Accept to install:

- **Terminals Manager** - Multi-terminal workflow
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript Next** - Enhanced TypeScript support
- **GitLens** - Git blame and history
- **Git Graph** - Visual git history
- **Docker** - Container management
- **PostgreSQL** - Database tools

### Terminals Manager

The Terminals Manager extension opens multiple terminals with predefined commands.

#### Installation

1. Install extension: `fabiospampinato.vscode-terminals`
2. Copy your preferred configuration:

   ```bash
   # For full development (all packages + apps)
   cp .vscode/terminals-rundev.json.example .vscode/terminals.json

   # For services only (database, message queue, etc.)
   cp .vscode/terminals-services.json.example .vscode/terminals.json

   # For basic terminals
   cp .vscode/terminals.json.example .vscode/terminals.json
   ```

#### Running Terminals

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type "Terminals: Run"
3. All configured terminals open with their commands

#### Available Configurations

| File                              | Purpose                                          |
| --------------------------------- | ------------------------------------------------ |
| `terminals-rundev.json.example`   | Full development with all packages in watch mode |
| `terminals-services.json.example` | Infrastructure services only                     |
| `terminals.json.example`          | Basic terminals for general use                  |

### Debugging

Use the launch configurations in `.vscode/launch.json`:

- **Debug API**: Launch API with debugger attached
- **Debug Current File**: Debug the currently open file
- **Debug Jest**: Run tests with debugging

### Tasks

Run tasks via Command Palette > "Tasks: Run Task":

- **Build All**: Build all packages and apps
- **Build Packages**: Build only packages
- **Lint**: Run ESLint
- **Type Check**: Run TypeScript type checking
- **Start DB/MQ/All Services**: Start Docker containers

### Multi-Root Workspace

For working with specific packages, use the workspace file:

```bash
code podverse.code-workspace
```

This opens a multi-root workspace with separate views for root, helpers, orm, api, and web.

## Other IDEs

### WebStorm / IntelliJ

1. Open monorepo as project
2. Mark `node_modules` and `dist` as excluded
3. Configure Node.js interpreter to use `.nvmrc` version
4. Enable ESLint integration

### Cursor

Works same as VS Code. All `.vscode/` configurations apply.

## Troubleshooting

### ESLint not working

Ensure you have ESLint extension installed and the workspace is properly loaded:

```bash
npm install  # Ensure dependencies are installed
```

### TypeScript errors not showing

1. Open any `.ts` file
2. Check bottom-right for TypeScript version
3. Should show workspace version from `node_modules/typescript`

### Terminals not starting

1. Ensure Terminals Manager extension is installed
2. Copy a template to `.vscode/terminals.json`
3. Reload VS Code window

```

## Checklist

- [x] Create `.vscode/terminals.json.example`
- [x] Create `.vscode/terminals-services.json.example`
- [x] Create `docs/IDE-SETUP.md`
- [x] Verify all files are valid
```
