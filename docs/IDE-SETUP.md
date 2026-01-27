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

### Code Formatting

This project uses **ESLint only** for both linting and formatting. No Prettier required.

**How it works:**
- On save, ESLint automatically fixes formatting issues (quotes, semicolons, etc.)
- The setting `"source.fixAll.eslint": "explicit"` in `.vscode/settings.json` enables this
- All formatting rules are defined in `eslint.config.mjs`

**Style rules:**
- Single quotes
- Semicolons required
- Trailing commas in multiline
- 2-space indentation

### Recommended Extensions

When you open the project, VS Code will prompt you to install recommended extensions. Accept to install:

- **Terminals Manager** - Multi-terminal workflow
- **ESLint** - Code linting and formatting
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

| File | Purpose |
|------|---------|
| `terminals-rundev.json.example` | Full development with all packages in watch mode |
| `terminals-services.json.example` | Infrastructure services only |
| `terminals.json.example` | Basic terminals for general use |

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

### ESLint not auto-fixing on save

1. Check that `dbaeumer.vscode-eslint` extension is installed
2. Verify `.vscode/settings.json` has `"source.fixAll.eslint": "explicit"`
3. Reload VS Code window (`Cmd+Shift+P` > "Developer: Reload Window")

### TypeScript errors not showing

1. Open any `.ts` file
2. Check bottom-right for TypeScript version
3. Should show workspace version from `node_modules/typescript`

### Terminals not starting

1. Ensure Terminals Manager extension is installed
2. Copy a template to `.vscode/terminals.json`
3. Reload VS Code window
