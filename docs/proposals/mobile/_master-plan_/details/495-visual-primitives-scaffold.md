# 495-visual-primitives-scaffold

**Master step:** 9b.6
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

- Add shared RN primitives under `apps/mobile/src/components/primitives/`: `Button`, `Card`,
  `ListRow`, `ScreenHeader`, plus `src/theme/spacing.ts` and `typography.ts`.
- Tokens only (`@podverse/design-tokens` / `useTheme`); no hardcoded hex; i18n strings passed in.
- Document in
  [DOCS-MOBILE-PROCESS-VISUAL-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-VISUAL-PARITY.md).

## Acceptance criteria

- Primitives export from a single index; Story-less smoke via one screen using all four
- Theme switch (when available) updates primitive colors
- No `@podverse/ui` import

## Web parity references

- Intent: `@podverse/ui` form/layout patterns — rebuild, do not port SCSS
- **mobile-theme-parity**, **DOCS-MOBILE-PROCESS-VISUAL-PARITY.md**

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
npm run mobile:android -- --device Pixel_6_Pro_API_33
```
