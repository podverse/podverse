# Import specifiers — Tier A (NodeNext), Tier B (Next.js src), Tier C (`packages/ui`)

This document describes **intentional** differences in how relative import specifiers are written across the monorepo.

## Tier A — NodeNext `.js` specifiers

**Where:** `packages/**` **except** `packages/ui/**`, plus `apps/api`, `apps/management-api`, `apps/workers`, `apps/*/sidecar`, `tools/**`, and `scripts/**/*.ts` / `*.mts` (see ESLint config).

**Rule:** Relative imports that resolve to TypeScript modules must use **`.js` in the specifier**, matching what `tsc` emits under `moduleResolution` **NodeNext**. Directory barrels use `./dir/index.js` when the implementation lives in `dir/index.ts` or `index.tsx`.

**Why:** Node executes emitted JavaScript; NodeNext aligns specifier text with runtime resolution.

## Tier C — Shared UI (`packages/ui`)

**Where:** `packages/ui/**` (published `@podverse/ui`, transpiled by consuming Next apps).

**Rule:** Use **extensionless** relative imports, same style as Tier B. Do **not** suffix relatives with `.js` — bundlers resolve that suffix literally and fail when sources are `.ts`/`.tsx`.

**Why:** Next (Turbopack/webpack) compiles this package from source; literal `.js` specifiers do not map to `.tsx` the way `tsc` NodeNext output does.

## Tier B — Next.js `apps/web/src` and `apps/management-web/src`

**Where:** `apps/web/src/**`, `apps/management-web/src/**`, and the same apps’ Playwright `e2e/**` (aligned with the parent app).

**Rule:** Keep **extensionless** relative imports (and existing project conventions) unless you have verified **`next build`** with Turbopack for your change. Do **not** bulk-codemod Tier B to `.js` specifiers yet.

**Why:** Turbopack’s resolution story for mapping `.js` specifiers onto `.tsx`/`.ts` sources differs from webpack’s `resolve.extensionAlias` behavior; production builds have relied on extensionless imports. Upstream tracking: [vercel/next.js#82945](https://github.com/vercel/next.js/issues/82945).

This split is **intentional technical debt** until Turbopack documents parity for extension-alias-style behavior.

## Enforcement

ESLint: local plugin **`nodeNextRelativeImports`** / rule **`require-relative-js-extension`** in root `eslint.config.mjs` — **error** on Tier A, **off** on Tier B and **off** on Tier C (`packages/ui`). Implementation: `eslint-rules/require-relative-js-extension.mjs`.

## Convergence checklist

When upstream fixes land and you adopt a compatible Next release, follow:

`.llm/plans/completed/tiered-import-specifiers-node-vs-next/06-future-convergence-todo.md`

## Related

- Rule: `.cursor/rules/import-specifiers-tiered.mdc`
- Skill: `.cursor/skills/import-specifiers-tiered/SKILL.md`
