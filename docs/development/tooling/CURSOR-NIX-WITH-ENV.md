# Cursor + Nix: `scripts/nix/with-env` and Agent Sandbox

This document explains the `scripts/nix/with-env` wrapper, why it exists, how to use it, and how to set up the same pattern in other Nix-based repos so Cursor’s agent (and similar tools) can run Node/npm and other flake tools reliably.

## The problem

- This repo uses **Nix** (a `flake.nix`) and **direnv** (`use flake` in `.envrc`) to provide Node.js, npm, and other tools. There is **no global Node or npm** on the system path by design.
- In a normal terminal, after `direnv allow`, the Nix dev shell loads and `node`/`npm` are on `PATH`.
- **Cursor’s agent** runs commands in its own environment. It often uses a minimal shell and does **not** load your `.zshrc`/`.bashrc` or direnv. So the agent’s `PATH` does not include the Nix dev shell, and commands like `npm run build` fail with “command not found”.

Putting Node on your user `PATH` does not fix the agent, because the agent’s shell is started by Cursor without your profile.

## The solution: `scripts/nix/with-env`

We run any command that needs the flake’s tools **inside** the Nix dev shell via a small wrapper script.

### What’s in this repo

| Item                                                                                   | Purpose                                                                                                                                  |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [scripts/nix/with-env](../../scripts/nix/with-env)                                     | Bash script that runs `nix develop <repo_root> -c "$@"`. Use it to run a single command with node, npm, and other flake tools on `PATH`. |
| [.cursor/rules/nix-terminal-wrapper.mdc](../../.cursor/rules/nix-terminal-wrapper.mdc) | Cursor rule (always applied) that tells the AI to use `./scripts/nix/with-env` for node/npm/npx and other flake tools.                   |
| [AGENTS.md](../../AGENTS.md)                                                           | Contains a short “Nix / terminal (agent sandbox)” section that points to the wrapper and the rule.                                       |

### How to use it

From the **repository root** (or any subdirectory; the script resolves the repo root itself):

```bash
./scripts/nix/with-env <command> [args...]
```

Examples:

```bash
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run dev:api
./scripts/nix/with-env npx some-package
./scripts/nix/with-env node --version
```

- **Who uses it:** You (when your terminal doesn’t have direnv loaded), Cursor’s agent, or any environment where `node`/`npm` are not on `PATH` but Nix is installed.
- **Cost:** Each invocation runs `nix develop` once for that command. For interactive use you can still `direnv allow` and use `npm` directly; use the wrapper when the environment doesn’t have the flake loaded.

### Verifying it works

From repo root, with Nix installed:

```bash
./scripts/nix/with-env node --version
./scripts/nix/with-env npm --version
```

You should see the Node and npm versions provided by the flake. If you see “command not found” for `nix`, Nix is not installed or not on the `PATH` used by that shell.

## Setting this up in another repo

Use the same pattern in any repo that uses a Nix flake and direnv and where you want Cursor’s agent (or similar) to run node/npm without a global install.

### 1. Add the wrapper script

Create `scripts/nix/with-env` (or another path you prefer; keep scripts under a subdirectory, e.g. `scripts/nix/`):

```bash
#!/usr/bin/env bash
# Run a command inside the repo's Nix dev shell (node, npm, and other flake tools on PATH).
# Usage: ./scripts/nix/with-env <command> [args...]
# Example: ./scripts/nix/with-env npm run build
# Run from repo root. Also works when invoked from subdirs (resolves repo root via script path).
set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec nix develop "$REPO_ROOT" -c "$@"
```

- If your flake exposes multiple dev shells and you want a non-default one, use e.g. `nix develop "$REPO_ROOT" .#otherShell -c "$@"`.
- Make it executable: `chmod +x scripts/nix/with-env`.

### 2. Add a Cursor rule

Create `.cursor/rules/nix-terminal-wrapper.mdc` (or similar name) so the AI always uses the wrapper when running node/npm/flake tools:

```markdown
---
description: Run node/npm and other flake tools via the Nix wrapper so the agent sandbox has the correct environment
globs: []
alwaysApply: true
---

# Nix Terminal Wrapper (Agent Sandbox)

This repo uses a Nix flake for Node/npm and other tools. There is no global Node on the system path in environments where the agent runs.

For any terminal command that needs `node`, `npm`, `npx`, or other tools provided by the flake, run it via the project wrapper from repo root:

\`\`\`bash
./scripts/nix/with-env <command> [args...]
\`\`\`

Examples: `./scripts/nix/with-env npm run build`, `./scripts/nix/with-env npm run lint`, `./scripts/nix/with-env npx ...`. Run from repo root.
```

Adjust the script path in the rule if you put the wrapper somewhere else (e.g. `./dev`).

### 3. Document in your AI/contributor guide

In your repo’s equivalent of AGENTS.md or CONTRIBUTING.md, add a short section, for example:

- “This repo uses a Nix flake for Node/npm. There is no global Node. For terminal commands that need node, npm, npx, or other flake tools (e.g. in Cursor’s agent), run them via `./scripts/nix/with-env <command>`. Run from repo root. See `docs/.../CURSOR-NIX-WITH-ENV.md` for details.”

### Checklist for a new repo

- [ ] `scripts/nix/with-env` created and executable.
- [ ] Cursor rule (e.g. `.cursor/rules/nix-terminal-wrapper.mdc`) added and points to your wrapper path.
- [ ] AGENTS.md or similar updated with one paragraph and a link to the full doc.
- [ ] Optional: copy or adapt this doc into your repo (e.g. `docs/development/tooling/CURSOR-NIX-WITH-ENV.md`) so others can replicate or debug.

## Troubleshooting

- **“nix: command not found”**  
  Nix is not installed or not on the `PATH` in the environment where the command runs. Install Nix and ensure it’s available in that context (e.g. Cursor’s agent may use a minimal `PATH`).

- **“error: … attempt to write a readonly database” (Nix cache)**  
  Nix is trying to write to its cache (e.g. `~/.cache/nix`) and the environment is read-only. Run the same command in a normal terminal where the cache is writable, or fix permissions for the Nix cache.

- **Agent still runs `npm` without the wrapper**  
  Ensure the Cursor rule exists, has `alwaysApply: true`, and clearly instructs to use `./scripts/nix/with-env` for node/npm/npx. Mentioning the wrapper in AGENTS.md (or your main AI guide) also helps.

- **Wrapper works in terminal but not in Cursor agent**  
  Confirm the agent is running from the repo root (or a subdirectory; the script resolves repo root). If the repo isn’t the workspace root in Cursor, the agent may be in a different directory tree; the script path must be valid from the agent’s cwd.
