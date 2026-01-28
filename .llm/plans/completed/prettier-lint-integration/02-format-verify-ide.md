# 02 – One-Time Format, Verify, and IDE

Run a one-time Prettier format, optionally update VS Code settings, verify CI, and note optional/future work.

**Prerequisite**: [01-setup-prettier-eslint-scripts.md](01-setup-prettier-eslint-scripts.md) is complete.

## 1. One-time format

- Run `npm run prettier:write` once. This will reformat all files matched by Prettier and not ignored.
- Prefer a **single, dedicated PR** (e.g. “Apply Prettier”) so that formatting churn is isolated from logical changes.
- After that, `lint` and `lint:fix` keep formatting consistent. New or edited files will be checked and fixed by the same pipeline.

## 2. VS Code

[.vscode/settings.json](../../../../.vscode/settings.json) already uses Prettier for TS, TSX, JS, JSON, Markdown. Once `.prettierrc` exists, the Prettier extension will use it.

Optional additions if you format YAML and SCSS:

- `"[yaml]": { "editor.defaultFormatter": "esbenp.prettier-vscode" }`
- `"[scss]": { "editor.defaultFormatter": "esbenp.prettier-vscode" }`

Keep `editor.formatOnSave` and `source.fixAll.eslint` as-is.

## 3. Verification

1. `npm run lint` passes (ESLint + Prettier check).
2. `npm run lint:fix` passes and leaves no Prettier/ESLint formatting changes when run again.
3. CI `npm run lint` step passes.
4. Format-on-save in VS Code uses project Prettier config for configured languages.

## 4. Optional / future

- **prettier-plugin-sh**: Add if you want `.sh` formatted; update `.prettierignore` so only desired scripts are included.
- **Overrides**: Use Prettier `overrides` in `.prettierrc` for per-directory rules (e.g. different `printWidth` for docs) if needed.
- **Pre-commit**: If you use something like `lint-staged`, add `prettier --write` for staged files so format-on-commit stays aligned with `lint:fix`.
