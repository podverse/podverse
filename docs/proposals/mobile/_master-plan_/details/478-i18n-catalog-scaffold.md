# 478-i18n-catalog-scaffold

**Master step:** 17.9
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

- Create `packages/i18n-catalog` workspace with layer directories (`shared/`, `consumer/`,
  `management/`, `mobile/` originals + overrides).
- Move or duplicate compile/translate scripts from `apps/web/scripts/i18n/` into shared scripts.
- Redirect root `npm run i18n:*` to catalog pipeline (keep app shims during transition).

## Acceptance criteria

- Package exists with documented merge order per **i18n-catalog-layers** rule
- `npm run i18n:compile` produces per-app compiled output paths

## Verification

```bash
npm run i18n:compile
npm run i18n:validate
```
