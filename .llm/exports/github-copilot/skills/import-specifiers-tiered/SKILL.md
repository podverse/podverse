---
name: import-specifiers-tiered
description: Tier A NodeNext .js specifiers vs Tier B Next.js src — follow repo boundaries when editing imports.
---


# Tiered import specifiers

## When to use

- Editing **relative imports** in **multiple tiers** (e.g. promoting code from `packages/*` into `apps/web`, or copying patterns between Tier A and Tier B).
- Considering a **codemod** or bulk fix for import paths.

## Rules of thumb

| Tier  | Locations                                                                                                                              | Relative imports                                                                                                                                                  |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | `packages/**` except `packages/ui`, `apps/api`, `apps/management-api`, `apps/workers`, `apps/*/sidecar`, `tools/**`, `scripts/**/*.ts` | Use **`.js`** specifiers for TS modules (`./foo.js`, `./dir/index.js` for barrels). ESLint **`nodeNextRelativeImports/require-relative-js-extension`** is **on**. |
| **C** | `packages/ui/**`                                                                                                                       | **Extensionless** relatives (same as Tier B). ESLint rule is **off**. Do not use `.js` suffix — Next bundles sources as `.tsx`.                                   |
| **B** | `apps/web/src/**`, `apps/management-web/src/**`, those apps’ `e2e/**`                                                                  | Prefer **extensionless** relative imports; ESLint rule is **off**. Do not bulk-add `.js` without verifying **`next build`** / Turbopack.                          |

## References

- Canonical doc: [docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md](../../../docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md)
- ESLint: [eslint.config.mjs](../../../eslint.config.mjs), rule implementation [eslint-rules/require-relative-js-extension.mjs](../../../eslint-rules/require-relative-js-extension.mjs)
- Cursor rule: `.llm/exports/github-copilot/instructions/import-specifiers-tiered.instructions.md`
- Upstream: [vercel/next.js#82945](https://github.com/vercel/next.js/issues/82945)
