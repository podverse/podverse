# 233-theme-token-stylesheet

**Master step:** 7.12
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add `apps/mobile/src/theme/createStyles.ts` (or equivalent) mapping `@podverse/design-tokens` to
  RN-friendly style factories.
- Define semantic groups: `screen`, `textPrimary`, `textSecondary`, `border`, `buttonPrimary`,
  `buttonSecondary` (align naming with web token semantics).
- Support `(theme: UITheme) => StyleSheet.create(...)` pattern for screen components.

## Acceptance criteria

- Token maps from design-tokens drive all theme-dependent colors in scaffold screens
- Each built-in theme produces distinct background/text colors
- No hardcoded hex in theme module (values live in design-tokens package)

## Web parity references

- [`packages/ui/src/styles/_themes.scss`](/packages/ui/src/styles/_themes.scss)
- **styles-source-of-truth** skill

## Verification

```bash
npm run build -w @podverse/design-tokens
grep -rq "createStyles\|useTheme" apps/mobile/src/theme
```
