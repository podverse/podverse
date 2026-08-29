# 01 — Deep-link path map + notification-target tests (15.3, 14.4/14.8)

**Cursor model:** Codex 5.3
**Ship bar:** Node-only vitest coverage for the routing map + notification payload→route extraction.

## Context (read first)

- `apps/mobile/src/navigation/deepLinking.ts` (pure: `mapIncomingPathToScopedPath`,
  `mapScopedPathToFlatPath`, `isAuthGatedDeepLink`).
- `apps/mobile/src/push/notificationRouting.ts` (`extractNotificationTargetPath` is pure but the
  module imports `expo-notifications`).
- `apps/mobile/vitest.config.ts` (node-only; narrow `include`).
- Skills: **unit-test-priority-confident**, **unit-test-design-no-overgranularity**,
  **import-specifiers-tiered** (Tier A `.js` specifiers).

## Tasks

1. **Extract pure notification target** — Create `apps/mobile/src/push/notificationTarget.ts`
   containing `extractNotificationTargetPath`, `ROUTABLE_TARGET_TYPES`, and `HOME_FALLBACK_PATH`
   (no `expo-notifications` import). Update `notificationRouting.ts` to import + re-export these
   (behavior-preserving; `resolveOpenedNotificationPath` uses the extracted fn + fallback).
2. **`apps/mobile/src/navigation/deepLinking.test.ts`** — cover `mapIncomingPathToScopedPath`:
   each flat content type (`podcast/episode/clip/album/artist/track` → `/home/<type>/<id>`), nav-scoped
   passthrough (`/more/settings`, `/search/...`), `playlist` → `/my-library/playlist/:id`,
   `profile` → `/more/profile/:id`, bare `settings` → `/more/settings`, unknown/empty → `/home`,
   full `https://podverse.fm/...` URL parsing, and query/hash stripping. Cover
   `mapScopedPathToFlatPath` round-trips and `isAuthGatedDeepLink` (`/history`, `/queues`,
   `/my-profile`, `/settings` true; public paths false).
3. **`apps/mobile/src/push/notificationTarget.test.ts`** — `url` wins; `{ type, id_text }` valid types
   → `/<type>/<id>`; unknown type → `null`; missing/empty/whitespace → `null`; non-string values → `null`.
4. Add both test files to the `include` array in `apps/mobile/vitest.config.ts` (and update the header
   comment listing covered modules).

## Acceptance

- `deepLinking.ts` mapping table + auth gating fully covered incl. fallback + URL parsing.
- Pure `extractNotificationTargetPath` covered incl. malformed→null; no expo import in the test path.
- New files listed in `vitest.config.ts` `include`.
