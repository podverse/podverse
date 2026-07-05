# 035-design-tokens-package

**Master step:** 0.20
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

- Create `packages/design-tokens` workspace (`@podverse/design-tokens`).
- Export `UITheme`, `ALL_POSSIBLE_THEMES` (re-export or mirror from `@podverse/ui` types).
- Export per-theme TS maps: background, text, border, button surface colors + spacing/radii scale.
- Source values from or kept in sync with `packages/ui/src/styles/_themes.scss` and
  `_variables-root.scss`.
- Add `PACKAGES-DESIGN-TOKENS.md` contributor doc; document sync obligation in **styles-source-of-truth**
  skill.
- Add package to mobile allowlist in `apps/mobile/AGENTS.md` (already documented).

## Acceptance criteria

- `@podverse/design-tokens` builds with `npm run build -w @podverse/design-tokens`
- All six built-in themes export complete token maps
- No DOM, SCSS, or React Native imports in the package (pure TS)
- Mobile can `import { getThemeTokens, UITheme } from '@podverse/design-tokens'`

## Web parity references

- [`packages/ui/src/lib/uiTheme/uiTheme.ts`](/packages/ui/src/lib/uiTheme/uiTheme.ts)
- [`packages/ui/src/styles/_themes.scss`](/packages/ui/src/styles/_themes.scss)
- [`apps/web/src/utils/localSettings/uiTheme.ts`](/apps/web/src/utils/localSettings/uiTheme.ts)
- **mobile-theme-parity** skill

## Verification

```bash
npm run build -w @podverse/design-tokens
npm run lint
grep -q design-tokens apps/mobile/AGENTS.md
```
