# 490-data-layer-db-scaffold

**Master step:** 9b.1
**Model (author + implement):** Opus 4.8
**Status:** planned

## Scope

- Add offline-first SQLite foundation under `apps/mobile/src/data/db/` using **expo-sqlite** +
  **Drizzle ORM** (default per
  [DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)).
- Schema bootstrap + migration runner; empty app entities tables ready for account/queue/add-by-rss.
- Document storage boundaries: SecureStore = tokens; AsyncStorage = tiny prefs; SQLite = entities.

## Acceptance criteria

- DB opens on cold start without crashing iOS + Android
- Migration version table exists; schema changes are forward-only SQL
- No tokens written to SQLite
- Contributor note in `APPS-MOBILE.md` or `src/data/README` (short)

## Web parity references

- N/A (mobile-only). Decision:
  [DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)
- Skill: **mobile-data-layer**

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
npm run mobile:android -- --device Pixel_6_Pro_API_33
```
