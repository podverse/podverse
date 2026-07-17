# Mobile PG-6 — Tracks 8 + 9 (Home + browse/content screens)

**Master plan:** [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
**Steps:** 8.1–8.15, 9.1–9.28
**Detail IDs:** 240–254 (Track 8), 260–287 (Track 9)
**Status:** done

## Goal

Turn the auth + navigation shell into a usable, browsable app: a Home screen with a media-type
selector and per-type feeds, plus content/detail screens (podcast, episode, album, artist, clip),
search, My Library (playlists, playlist detail, queue, history, my clips), profile/my-profile, the
RSS/add-by-rss tab, OPML entry points, and Maestro screenshot flows.

## Web-style parity (required this phase)

Every screen with a web counterpart **must mirror the web app's visual design** — layout,
information hierarchy, list-row structure, and loading/empty/error states — adapted to React Native
primitives and `@podverse/design-tokens` (no hardcoded hex). See
[`.cursor/skills/mobile-theme-parity/SKILL.md`](/.cursor/skills/mobile-theme-parity/SKILL.md)
§ Screen & visual parity and the per-screen **Web parity references** in each detail doc. Diverge
only for platform conventions (native back, pull-to-refresh, safe area, tab bar) and note why.

## Prerequisites (all satisfied)

- Track 6 auth `done`; Track 7 nav shell + theme (7.11–7.16) `done`.
- Track 5 E2E harness `done` (API profile 4230, seed, HTML report).
- `@podverse/design-tokens` `done` (Track 0.20).

## Locked decisions / conventions

| Item | Decision |
| ---- | -------- |
| Media types | Podcasts, Episodes, Clips, Artists, Albums, Tracks (web order) |
| Data access | `createMobileApiRequestService()` `req*` methods; no raw fetch |
| DTO imports | `@podverse/helpers` **subpath** exports only (never the barrel) |
| Playback from rows | Thin stub/hook now; replaced by Track 10 queue without touching row UI |
| Styling | `@podverse/design-tokens` + `StyleSheet` factories; no `@podverse/ui`/SCSS |
| E2E | Maestro `apps/mobile/e2e/*.yaml`; not `make e2e_*` |
| i18n | All user-facing copy via catalog `t()`; no hardcoded English |

## Out of scope

- Real queue / auto-queue / history mutations engine (Track 10) — rows use a stub hook.
- Mini/full player UI internals (Track 11); Track 2 full video engine (PG-5).
- OPML parse/generate + settings screen internals (Track 16); CarPlay (Track 12).

## Step 10 category decision (9.24)

- Categories browse is intentionally skipped for this phase: mobile Home/Search scope in Tracks 8–9
  already covers the highest-frequency discovery paths, while web category browse parity can be
  added later in Track 16+ once queue/player internals stabilize.
