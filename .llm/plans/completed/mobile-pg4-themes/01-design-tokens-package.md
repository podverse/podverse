# 01 — Design tokens package

Implement master step **0.20** per detail doc
[035-design-tokens-package](/docs/proposals/mobile/_master-plan_/details/035-design-tokens-package.md).

## Tasks

1. Create `packages/design-tokens` with `package.json`, `tsconfig`, build script.
2. Export `UITheme`, `ALL_POSSIBLE_THEMES`, `getThemeTokens(theme)`.
3. Map all six built-in themes from `_themes.scss` color tokens (manual TS or codegen script).
4. Add `PACKAGES-DESIGN-TOKENS.md`.
5. Mark step 0.20 `done` in master plan when complete.

## References

- **styles-source-of-truth**, **mobile-theme-parity** skills
- Web theme type: `packages/ui/src/lib/uiTheme/uiTheme.ts`

Do not run tests during agent work. End with operator verification commands.
