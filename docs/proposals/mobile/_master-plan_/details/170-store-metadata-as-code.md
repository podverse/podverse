# 170-store-metadata-as-code

**Master step:** 4.21
**Model (author + implement):** Auto
**Status:** ready

## Scope

- Scaffold directory for store metadata (screenshots, release notes) under e.g.
  `apps/mobile/store-metadata/` or `docs/operations/mobile/store-metadata/`.
- Prefer EAS metadata format when using EAS.

## Acceptance criteria

- Directory + README stub exists
- Not uploading to prod listing

## Verification

```bash
test -d apps/mobile/store-metadata -o -d docs/operations/mobile/store-metadata
```
