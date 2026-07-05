# 476-i18n-key-parity-ci

**Master step:** 17.7
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

- CI script: mobile consumer keys ⊆ catalog `consumer/` keys (plus allowed `mobile/` overlay keys).
- Fail on missing keys after copy or catalog import.
- Optional: warn on mobile-only keys not in catalog.

## Acceptance criteria

- Script runnable from repo root (`npm run i18n:validate` or dedicated script)
- Documented in catalog package README

## Verification

```bash
npm run i18n:validate
```
