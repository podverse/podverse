# 005-exclude-mobile-lint

**Master step:** 0.5
**Model (author + implement):** Auto
**Status:** ready

## Scope

Scope or exclude `apps/mobile` from root lint sweep until RN ESLint is ready.

## Acceptance criteria

- Documented approach in APPS-MOBILE or lint config
- Root `npm run lint` policy clear for pre-bootstrap vs post-bootstrap

## Web parity references

- [package.json lint script](/package.json lint script)

## Verification

```bash
grep -q mobile package.json || test -f apps/mobile/eslint.config.js
```
