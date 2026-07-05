# 003-eslint-mobile-override

**Master step:** 0.3
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Add ESLint override for `apps/mobile/**`: extensionless imports, React Native globals.

## Acceptance criteria

- Override block exists in root ESLint config or `apps/mobile/eslint.config.*`
- RN globals (e.g. `__DEV__`) not flagged
- Consistent with Tier D doc

## Web parity references

- [docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md](/docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md)

## Verification

```bash
npm run lint -w apps/mobile  # after workspace exists, or grep eslint config for apps/mobile
```
