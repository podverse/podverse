---
name: bundle-optimization
description: Keeps bundle size in mind when adding dependencies, changing helper packages, or modifying the web app. Use when adding npm deps, touching @podverse/helpers*, introducing heavy UI, or working on client-side code in apps/web.
version: 1.0.0
---

# Bundle Optimization

This skill reminds you to consider **client bundle size** when making changes that affect the web app. Apply it when adding dependencies, modifying helper packages, or building client-side features.

## When to Apply

- Adding or upgrading **npm dependencies** used by `apps/web`
- Changing **`@podverse/helpers`**, **`@podverse/helpers-requests`**, **`@podverse/helpers-validation`**, or **`@podverse/helpers-browser`**
- Adding **heavy UI** (players, modals, charts, drag-and-drop, large lists)
- Importing **date-fns**, **axios**, or other known-heavy libraries
- Creating **new client components** or **shared utilities** used by the web app

## Core Principles

1. **Measure first**  
   Use **real JS bundle size** (e.g. `totalAssetSize` from bundle analyzer stats), not HTML report size. Run `tools/web-perf/bundle-analyzer` and compare reports when optimizing.

2. **Prefer tree-shaking**
   - Use **named imports** (`import { X } from 'pkg'`) or **subpath imports** (`import X from 'pkg/x'`) instead of `import *` or barrel imports that pull the whole package.
   - Helper packages should set `"sideEffects": false` in `package.json`.

3. **Minimize client-only code**
   - **Do not** import `@podverse/helpers-backend` or `@podverse/helpers-config` in client code; they are for API/workers/build scripts.
   - Import only what you need from `@podverse/helpers` and `@podverse/helpers-requests`; avoid pulling unrelated DTOs or request helpers.

4. **Lazy-load heavy UI**  
   Use `next/dynamic` for below-the-fold components, modals, players, and route-specific heavy UI. Provide `loading` fallbacks.

5. **Watch heavy dependencies**
   - **date-fns**: Use subpath imports (`date-fns/format`, `date-fns/formatDuration`, etc.) and only the **locales you need** (`date-fns/locale/en-US`, etc.).
   - **axios**: Used by `@podverse/helpers-requests`; avoid adding it elsewhere in client code.
   - Prefer **small, focused** libraries over all-in-one bundles when adding deps.

## Before Adding a Dependency

- [ ] Is it needed **only on the client**? If server-only, keep it out of client bundles (e.g. use in API/workers only).
- [ ] Does it support **tree-shaking** (ESM, `sideEffects: false`)?
- [ ] Can we use **subpath imports** or a smaller alternative?
- [ ] Will it be used in **above-the-fold** code? If not, can we **lazy-load** it?

## Before Changing Helper Packages

- [ ] Are we adding code that **only** runs on server/build? Keep it in `helpers-backend` or `helpers-config`; **do not** import those in `apps/web` client code.
- [ ] Does the package have **`"sideEffects": false`**? Add it if missing.
- [ ] Are we adding **date-fns** or other heavy deps? Use subpath imports and minimal locales.

## Before Adding Heavy Client UI

- [ ] Can it be **lazy-loaded** with `next/dynamic`?
- [ ] Is it **below-the-fold** or **route-specific**? Prefer lazy-loading.
- [ ] Are we using **virtualization** for long lists? Use `react-virtuoso` where applicable.

## References

- **Web performance patterns**: [web/09-performance-optimization.md](../web/09-performance-optimization.md) — code splitting, memoization, images, **Bundle Optimization** section.
- **Bundle analyzer**: `tools/web-perf/bundle-analyzer` — run `npm run analyze:web` for `apps/web`; use reports to compare **client total asset size**. The analyzer is interactive (prompts for comparison and report name); do not complete those steps automatically — see **interactive-prompts** skill.
- **Plans**: `.llm/plans/active/bundle-optimizations/` — fix measurement, `sideEffects`, date-fns, lazy-load, optional ESM/audit.
- **AGENTS.md** — `npm run build:packages`, lint, and verification commands.

## Quick Checklist

When touching client bundles:

- Measure with bundle analyzer (real JS size, not HTML).
- Use `sideEffects: false` in helper packages.
- Prefer subpath / named imports; avoid barrels for heavy libs.
- Lazy-load heavy, below-the-fold UI.
- Do not import backend-only helpers in client code.
