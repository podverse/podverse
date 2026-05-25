---
description: "Tier B Next.js apps and Tier C packages/ui — extensionless relatives; Tier A uses NodeNext .js"
applyTo:
  - "apps/web/src/**/*.ts"
  - "apps/web/src/**/*.tsx"
  - "apps/management-web/src/**/*.ts"
  - "apps/management-web/src/**/*.tsx"
  - "packages/ui/**/*.ts"
  - "packages/ui/**/*.tsx"
---

# Tiered import specifiers

- **Tier A** (`packages/**` except `packages/ui`, Node apps, sidecars, `tools/**`, scripts): relative TS modules use **`.js` specifiers** (NodeNext). ESLint enforces this.
- **Tier C** (`packages/ui`): **extensionless** relatives (bundler-transpiled shared UI). ESLint NodeNext rule is **off**. Do not add `.js` — breaks resolution to `.tsx` sources.
- **Tier B** (`apps/web/src`, `apps/management-web/src`): keep **extensionless** relative imports unless you have confirmed **`next build`** succeeds with `.js` specifiers toward `.tsx` sources.

Do not mass-refactor Tier B or Tier C imports to match Tier A without a green Turbopack production build. See [docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md](../../docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md) and [vercel/next.js#82945](https://github.com/vercel/next.js/issues/82945).
