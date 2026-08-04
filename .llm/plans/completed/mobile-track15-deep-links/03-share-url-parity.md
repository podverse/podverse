# 03 — Share URL parity (15.5)

**Cursor model:** Codex 5.3
**Detail:** 454
**Ship bar:** Web-parity share URLs + functional share buttons. No Track 23 polish.

## Goal

Generate the same shareable URLs as web across podcast/episode/clip/playlist/profile detail screens,
so links round-trip through the 450–452 universal/App Links.

## Context (read first)

- Detail 454.
- `apps/mobile/src/lib/playback/shareNowPlaying.ts` (`buildNowPlayingShareUrl`, base URL const).
- `apps/mobile/src/screens/player/FullPlayerScreen.tsx` (`Share.share`, `full-player-share`).
- Web: `apps/web/src/components/Modal/ModalShare.tsx`.
- Skills: **reusable-components**, **i18n-user-facing-strings**, **mobile-surface-async-errors**.

## Tasks

1. Extend the share helper to a shared URL builder covering podcast, episode, clip, **playlist**,
   **profile** by `id_text`, sourced from a canonical web base URL in config (env-driven, matching
   450/451 domains) — do not hardcode per call site.
2. Add functional share affordances on the podcast/episode/playlist/profile detail screens invoking
   `Share.share` with the correct URL (skip in E2E where share sheet is not automatable).
3. i18n labels for share actions (no hardcoded English).
4. Mark **15.5** `done` in master plan Tracks + Appendix C; detail 454 header `done`.

## Out of scope

- Track 23 visual polish; OG/preview metadata (web SEO owns it).

## Acceptance

- Mobile share URLs match web shapes `${WEB.origin}/{resource}/{id_text}`.
- Base URL from config; share buttons work on the target detail screens.
