# Future convergence — Tier B → `.js` (living checklist)

When Turbopack / Next ship **documented** parity with webpack **`resolve.extensionAlias`** (`.js` → `.ts`/`.tsx`), Tier B can align with Tier A.

## Track upstream

- [ ] Watch [vercel/next.js#82945](https://github.com/vercel/next.js/issues/82945)
- [ ] Watch related PRs (e.g. extension alias / Turbopack module resolution)

## When fixed in a Next release you adopt

- [ ] Re-run spike: `./scripts/nix/with-env npm run build -w apps/web` and `apps/management-web` with **`.js` relative specifiers** to `.tsx` sources.
- [ ] If green, optional codemod Tier B sources to NodeNext-style `.js` specifiers.
- [ ] Remove ESLint **Tier B override** for `nodeNextRelativeImports/require-relative-js-extension` (enable same rule as Tier A for Next `src`).
- [ ] Update [`docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md`](../../../../docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md) — collapse tiers if unified.
- [ ] Update [`.cursor/rules/import-specifiers-tiered.mdc`](../../../../.cursor/rules/import-specifiers-tiered.mdc) or retire if redundant.

## Remove optional workarounds

If any **loader-based** rewrite was added (see plan `02`), remove after native support is verified.
