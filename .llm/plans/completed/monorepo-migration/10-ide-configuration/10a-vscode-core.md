# Phase 10A: VS Code Core Configuration

**Status**: Completed
**Estimated Effort**: 1-2 hours

## Overview

Create core VS Code configuration files for optimal monorepo development experience.

## Prerequisites

- Phase 1 infrastructure complete ✅

## Files to Create

### 1. `.vscode/settings.json`

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

### 2. `.vscode/extensions.json`

```json
{
  "recommendations": [
    "fabiospampinato.vscode-terminals",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "eamodio.gitlens",
    "mhutchie.git-graph",
    "christian-kohler.path-intellisense",
    "formulahendry.auto-rename-tag",
    "naumovs.color-highlight",
    "ms-azuretools.vscode-docker",
    "ckolkman.vscode-postgres",
    "yzhang.markdown-all-in-one",
    "bierner.markdown-mermaid"
  ],
  "unwantedRecommendations": []
}
```

### 3. `.vscode/launch.json`

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

### 4. `.vscode/tasks.json`

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

### 5. `podverse.code-workspace`

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

## Checklist

- [x] Create `.vscode/settings.json`
- [x] Create `.vscode/extensions.json`
- [x] Create `.vscode/launch.json`
- [x] Create `.vscode/tasks.json`
- [x] Create `podverse.code-workspace`
- [x] Verify files are valid JSON
