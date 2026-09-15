# Phase 2 — Home subscribed chips + discovery CTAs

Area: **P2.1.1 Home** follow-up (closes Artists/Albums/Tracks/Clips global-directory gap).

Detail docs: `739`–`741` under `docs/proposals/mobile/_master-plan_/phase-2/details/`.

(IDs start at 739 because 738 is `browse-podcast-host-names`.)

## Locked decisions

1. **Home is subscribed-only for every chip.** Never `type: 'global'` on Home.
2. **Empty buttons** — Podcasts: Search + Browse; Artists/Albums/Tracks: Search (music) + Browse;
   Episodes/Clips (non-login): Browse only.
3. **Clips + auth** — local podcast follows + signed out → Login fill; no podcast follows → Browse;
   signed in + zero clips → Browse. Login, not membership.
4. **Empty copy** — generic `subscriptions.empty_message`; login fill uses
   `authentication.login_required`.
5. **Filter** — only Podcasts, Artists, Albums (and only when rows exist).
6. **Data** — persist `kind` (`podcasts` | `artists` | `albums`); Tracks from local music-channel
   items; Clips API `type: subscribed` when authenticated only.
7. **Sort / All chip** stay deferred in 720; this set only removes the global-directory
   contradiction.
8. **Web / API / ORM** — no matching change. Intentional divergence.

## Out of scope

- Clip row chrome / visual polish
- Sort coverage for Clips/Artists/Albums/Tracks (720)
- All media-type chip (720)
- Web Home media-type chips
