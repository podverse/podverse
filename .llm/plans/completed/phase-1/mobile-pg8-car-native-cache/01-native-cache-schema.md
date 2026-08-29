# 01 — Native cache schema (12.1)

**Cursor model:** Opus 4.8  
**Details:** [380-native-cache-schema](/docs/proposals/mobile/_master-plan_/phase-1/details/380-native-cache-schema.md)

## Goal

Define the authoritative JSON schema for queue / downloads / library browse native-cache
payloads and align TypeScript projection types + engine README.

## Do

1. Read detail 380, `projection.ts`, engine README § native cache, and
   `DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md`.
2. Finalize `schemaVersion` + field lists for all three payloads (extend types under
   `apps/mobile/src/data/nativeCache/` as needed).
3. Add a short schema reference in
   `apps/mobile/modules/podverse-media-engine/README.md` (point to detail 380; drop “v0 draft”
   as authority).
4. Keep bridge method names unchanged (`writeQueueSnapshot`, `writeDownloadsIndex`,
   `writeLibraryBrowseIndex`).
5. Mark master step **12.1** + Appendix C **380** + detail header **done** when finished.

## Do not

- Implement durable iOS/Android persist here (12.2–12.3).
- Build CarPlay templates or Auto browse trees.
- Change SQLite / Drizzle schemas.
- Run tests during agent work.

## Skills / rules

- **mobile-carplay-android-auto**, **mobile-data-layer**, **mobile-playback**

## Operator verify (end of phase — not this prompt alone)

```bash
rg -n 'schemaVersion' apps/mobile/src/data/nativeCache
rg -n '380-native-cache-schema|schemaVersion' \
  apps/mobile/modules/podverse-media-engine/README.md
```
