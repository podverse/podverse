# 01 – Setup Prettier, ESLint, and Scripts

Install Prettier and `eslint-config-prettier`, add config and ignore files, update ESLint, and wire root `lint` / `lint:fix` scripts.

## 1. Install dependencies (root)

Add to root [package.json](../../../../package.json) `devDependencies`:

- `prettier` (e.g. `^3.4.2`)
- `eslint-config-prettier` (e.g. `^10.1.8`)

Optional (if formatting shell scripts):

- `prettier-plugin-sh`

Run `npm install` at repo root.

## 2. Prettier config

Create **`.prettierrc`** at repo root. Match current ESLint/style to avoid unnecessary churn:

- `semi: true`
- `singleQuote: true`
- `tabWidth: 2`
- `trailingComma: "es5"` (align with `comma-dangle: always-multiline`)
- `printWidth: 100` (or keep default 80; decide per team)

If using shell formatting, add:

```json
"plugins": ["prettier-plugin-sh"]
```

Use `.prettierrc.json` or `.prettierrc.js` if you prefer.

## 3. `.prettierignore`

Create **`.prettierignore`** at root. Exclude build outputs, lockfiles, generated files, and unformattable paths. Mirror [.gitignore](../../../../.gitignore) where relevant, and add Prettier-specific entries:

- `node_modules/`
- `**/dist/`, `**/.next/`, `out/`
- `package-lock.json`
- `**/*.tsbuildinfo`
- `apps/*/i18n/compiled/`
- `coverage/`
- `*.log`, `logs/*` (except any you explicitly format)
- `infra/config/local/`, `infra/config/alpha/` (secrets)
- `.env`, `**/.env`, `**/.env.*` (except `.env.example` / templates if you format those)
- Any generated or vendored paths (e.g. `.next/`, standalone builds)

Ensure `prettier --check .` and `prettier --write .` only touch source and config you intend to format.

## 4. ESLint + Prettier: disable formatting rules

In [eslint.config.mjs](../../../../eslint.config.mjs):

1. Import the flat config:  
   `import eslintConfigPrettier from 'eslint-config-prettier/flat';`
2. Append it **last** to the config array passed to `tseslint.config(...)`.  
   This turns off rules that conflict with Prettier (e.g. `semi`, `quotes`, `comma-dangle`).
3. Remove the now-redundant formatting rules from the custom config block (or leave them; the Prettier config overrides them). Prefer a single source of truth: Prettier for formatting, ESLint for non-formatting.

Result: ESLint no longer enforces formatting; Prettier does. `eslint --fix` will not change formatting; `prettier --write` will.

## 5. Root npm scripts

In root [package.json](../../../../package.json), add:

- `"prettier:check": "prettier --check ."`
- `"prettier:write": "prettier --write ."`

Update existing scripts:

- `"lint": "npm run lint --workspaces --if-present && npm run prettier:check"`
- `"lint:fix": "npm run lint:fix --workspaces --if-present && npm run prettier:write"`

Order: run ESLint first, then Prettier. For `lint:fix`, ESLint fixes what it can, then Prettier formats everything in scope.

## 6. CI and usage

- **CI**: No change. It already runs `npm run lint`. With the new `lint` script, that will run workspace ESLint **and** `prettier --check`. If either fails, CI fails.
- **Local**: `npm run lint` checks; `npm run lint:fix` fixes ESLint issues and formats all Prettier-covered files.

## Verification

- `npm run prettier:check` runs without error (may fail until repo is formatted).
- `npm run lint` runs workspace ESLint then `prettier --check` (lint may fail on unformatted files).
- `npm run lint:fix` runs workspace ESLint `--fix` then `prettier --write`.
