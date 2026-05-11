# ESLint enforcement (Podverse)

## Approach: local rule (not `import-x/extensions`)

`eslint-plugin-import-x`’s `import-x/extensions` resolves TypeScript on disk and conflicts with **NodeNext** (specifiers use `.js` while files are `.ts`). This repo instead uses a **local ESLint rule**:

- **File:** [eslint-rules/require-relative-js-extension.mjs](../../../../eslint-rules/require-relative-js-extension.mjs)
- **Plugin id:** `nodeNextRelativeImports`
- **Rule id:** `require-relative-js-extension`

The rule uses the filesystem to decide whether a relative import targets a **sibling** module (`./foo.js` when `foo.ts` exists) or a **directory barrel** (`./foo/index.js` when `foo/index.ts` exists), so autofix does not turn `./components/form/Form` into a bogus `./Form.js`.

## Wiring

Registered in root [eslint.config.mjs](../../../../eslint.config.mjs):

- **Tier A (error):** `packages/**/*.{ts,tsx}`, `apps/api/**`, `apps/management-api/**`, `apps/workers/**`, `apps/web/sidecar/**`, `apps/management-web/sidecar/**`, `tools/**/*.{ts,tsx}`, `scripts/**/*.{ts,mts}`
- **Tier C (off):** `packages/ui/**/*.{ts,tsx}` — extensionless relatives (bundler-transpiled shared UI)
- **Tier B (off):** `apps/web/src/**`, `apps/management-web/src/**`, `apps/web/e2e/**`, `apps/management-web/e2e/**`

## Tier C wiring note

The **`packages/ui`** override must register **only** `rules` (turn the rule **off**). Re-declaring `plugins.nodeNextRelativeImports` in that block triggers ESLint flat-config **“Cannot redefine plugin”** because Tier A already applies the same plugin to `packages/**/*`.

## Interaction with import sorting

Podverse uses **`eslint-plugin-simple-import-sort`** (`simple-import-sort/imports`). Run `npm run lint:fix` after rule changes; flat-config **later blocks override** earlier ones for the same file—Tier C and Tier B blocks must follow Tier A so the rule is disabled for `packages/ui` and Next app sources.

## Verification

```bash
./scripts/nix/with-env npm run lint
```

Tier A paths should have **no** `nodeNextRelativeImports/require-relative-js-extension` violations after a sweep.
