# 014-cursorrules-mobile-note

**Master step:** 0.14
**Model (author + implement):** Auto
**Status:** ready

## Scope

Update `.cursorrules` with mobile tier note and `-w apps/mobile` commands pointer.

## Acceptance criteria

- Short mobile section or bullet in .cursorrules
- Commands from monorepo root pattern

## Web parity references

- [.cursorrules](.cursorrules)
- [.cursor/rules/commands-from-monorepo-root.mdc](.cursor/rules/commands-from-monorepo-root.mdc)

## Verification

```bash
grep -q "apps/mobile" .cursorrules
```
