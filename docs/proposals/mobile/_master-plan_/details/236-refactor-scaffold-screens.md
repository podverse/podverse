# 236-refactor-scaffold-screens

**Master step:** 7.15
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

- Refactor `HelloWorldScreen` and navigation shell chrome to use `useTheme()` + `createStyles`.
- Remove hardcoded hex colors (`#ffffff`, `#333333`, etc.).
- Tab bar / header colors use token maps when nav shell exists (Track 7.1+).

## Acceptance criteria

- No hardcoded theme colors in `apps/mobile/src/screens/HelloWorldScreen.tsx`
- Screen readable in `dark` and `light` themes (manual smoke)
- Tier D extensionless imports preserved

## Web parity references

- [`apps/mobile/src/screens/HelloWorldScreen.tsx`](/apps/mobile/src/screens/HelloWorldScreen.tsx) — before refactor

## Verification

```bash
! grep -E '#[0-9a-fA-F]{3,8}' apps/mobile/src/screens/HelloWorldScreen.tsx
npm run start -w apps/mobile
```
