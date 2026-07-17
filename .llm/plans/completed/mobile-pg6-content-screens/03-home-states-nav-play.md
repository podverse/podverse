# 03 — Home states, row navigation, play stub

Implement master steps **8.10–8.13**.

## Detail docs

- 249-home-pull-to-refresh, 250-home-state-handling, 251-home-row-navigation, 252-home-play-action-stub

## Tasks

1. Add pull-to-refresh (`RefreshControl`) per feed.
2. Build reusable `ListLoading` / `ListEmpty` / `ListError` (retry) state components under
   `apps/mobile/src/components/state/`; wire into every feed. Reuse across Track 9.
3. Wire row taps to the Home stack detail routes by media type (podcast/episode/clip/artist/album/
   track) with web-parity params.
4. Add a play/queue action affordance behind a thin stub hook (stable call site for Track 10).
5. Mark **8.10–8.13** / **249–252** `done`.

Do not run tests during agent work.
