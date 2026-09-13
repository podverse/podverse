# Execution order — mobile-p2-library-downloads

## Phase 1 — Foundations (sequential)

1. `01-chrome-and-primitives.md` — redundant titles, Button danger, SwipeActionRow
2. `02-download-engine.md` — schema, pause/resume, concurrency 5, prefs, quota, auto-free

## Phase 2 — Surfaces (after Phase 1; 03 then 04 can follow 02)

3. `03-settings-downloads.md` — Settings → Downloads + limit picker
4. `04-downloads-list.md` — Library Downloads monitor screen

## Phase 3 — Home + banner + E2E

5. `05-home-footer-and-banner.md` — unsubscribed section + download activity chrome
6. `06-e2e-and-i18n.md` — Maestro flows + catalog keys

Do not start Phase 2 until Phase 1 is done. Within Phase 2, prefer 03 before 04 (list no longer owns
storage). Phase 3 after 02–04.
