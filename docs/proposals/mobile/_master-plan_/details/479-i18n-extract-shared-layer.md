# 479-i18n-extract-shared-layer

**Master step:** 17.10
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Move cross-app keys from web and management `en-US.json` into `packages/i18n-catalog/shared/originals/`.
- Candidates: `language.*`, `errors.boundary_*`, shared `misc.*`, `settings.ui_theme.*`.
- Remove duplicated keys from app layers; CI rejects same key path in multiple layers.

## Acceptance criteria

- Shared layer contains documented key set
- Web and management still compile after extraction
- LLM translate runs on shared + layer sources

## Verification

```bash
npm run i18n:all
npm run i18n:validate
```
