# Prettier Lint Integration – Execution Guide

## Order

Run in sequence:

1. **01-setup-prettier-eslint-scripts.md** – Install deps, add `.prettierrc`, `.prettierignore`, update ESLint config, add root `prettier:check` / `prettier:write` and update `lint` / `lint:fix`.
2. **02-format-verify-ide.md** – One-time `prettier --write`, optional VS Code updates, CI verification, optional/future items.

## TL;DR

```bash
# After 01:
npm install
npm run lint        # may fail until format
npm run lint:fix    # formats everything

# After 02 (one-time format PR, then):
npm run lint        # passes
npm run lint:fix    # no-op if already formatted
```

## Agent Assignment

- **Agent 1**: Execute `01-setup-prettier-eslint-scripts.md`.
- **Agent 2**: After 01 is done, execute `02-format-verify-ide.md` (including one-time format and verification).

Both can be done by a single agent in sequence.
