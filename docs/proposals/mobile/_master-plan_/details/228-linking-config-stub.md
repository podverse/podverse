# 228-linking-config-stub

**Master step:** 7.9
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- React Navigation linking config stub mirroring web resource path shapes
  (`/podcast/:id`, `/episode/:id`, etc.).
- Full deep-link QA is Track 15 — this step only reserves config + documents prefixes.
- App scheme / universal links deferred to Track 15 detail docs.

## Acceptance criteria

- `linking` object exported from navigation module
- Documented in `APPS-MOBILE.md` as stub

## Web parity references

- Web app routes for podcast/episode/clip/playlist

## Verification

```bash
rg -n "linking" apps/mobile/src/navigation || true
```
