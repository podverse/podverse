# 02 – Optional: Shell Formatting and Pre-Commit Prettier

Optional follow-ups from the Prettier lint plan. Skip either or both if not needed.

## A. prettier-plugin-sh (format `.sh` scripts)

**Goal**: Format shell scripts with Prettier so they’re included in `lint` / `lint:fix`.

1. **Install**: `npm i -D prettier-plugin-sh` at root.

2. **Config**: In [.prettierrc.json](../../../../.prettierrc.json), add:
   ```json
   "plugins": ["prettier-plugin-sh"]
   ```

3. **Scope**: By default Prettier will format `.sh` files. If you want to exclude some (e.g. generated or vendored), add them to [.prettierignore](../../../../.prettierignore).

4. **Format once**: Run `npm run prettier:write`, then `npm run prettier:check` and `npm run lint` to verify.

## B. lint-staged + Prettier (format on commit)

**Goal**: Run Prettier on staged files at commit time so format-on-commit matches `lint:fix`.

The repo uses custom git hooks ([scripts/git-hooks/](../../../../scripts/git-hooks/)) but not lint-staged. Adding it is optional.

1. **Install**: `npm i -D lint-staged` at root.

2. **Config**: In root [package.json](../../../../package.json), add a `"lint-staged"` key, e.g.:
   ```json
   "lint-staged": {
     "*.{ts,tsx,js,mjs,cjs,json,md,yml,yaml,scss,css}": "prettier --write"
   }
   ```
   Add `"*.sh"` if you use prettier-plugin-sh. Adjust globs to match what you format.

3. **Run on commit**: Wire lint-staged into the commit flow:
   - **Option A**: Use `husky` and a `pre-commit` hook that runs `npx lint-staged`. This adds a new hook; coordinate with existing [commit-msg](../../../../scripts/git-hooks/commit-msg) / [pre-push](../../../../scripts/git-hooks/pre-push) hooks.
   - **Option B**: Run `npx lint-staged` manually before committing, or from a custom script that your team uses.

4. **Verify**: Stage some files, run `npx lint-staged`, then `npm run lint` – no new formatting issues.

## Verification

- **A**: `npm run prettier:check` and `npm run lint` pass; `.sh` files are formatted.
- **B**: Commits (or your pre-commit step) run Prettier on staged files; `npm run lint` passes after commit.
