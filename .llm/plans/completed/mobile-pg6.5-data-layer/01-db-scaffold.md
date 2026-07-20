# 01 — DB scaffold (expo-sqlite + Drizzle)

Implement master step **9b.1**.

## Detail docs

- [490-data-layer-db-scaffold](/docs/proposals/mobile/_master-plan_/details/490-data-layer-db-scaffold.md)

## Decision / skills

- [DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)
- **mobile-data-layer**

## Tasks

1. Add **expo-sqlite** + **Drizzle ORM** under `apps/mobile` (Expo peer pins via
   `npm --prefix apps/mobile exec -- expo install` / `npm run mobile:install` as needed — not bare
   root `npx expo`).
2. Create `apps/mobile/src/data/db/` — client, schema module(s), forward-only migrations, open on
   cold start (wire from app bootstrap without blocking UI forever).
3. Bootstrap empty / placeholder tables ready for account, queue, add-by-rss domains (or a
   migration_version table + minimal entities — enough that later repos can extend).
4. Document storage boundaries briefly (`APPS-MOBILE.md` or `src/data/README`): SecureStore =
   tokens; AsyncStorage = tiny prefs; SQLite = entities; native cache = car/watch projection.
5. Mark **9b.1** / **490** `done` in master plan + Appendix C + detail header.

## Acceptance

- DB opens on cold start iOS + Android without crash
- Migration versioning exists; no tokens in SQLite
- Follow **mobile-data-layer**; no `@podverse/orm`

Do not run tests during agent work.
