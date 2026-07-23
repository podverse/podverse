# 04 — Up-next sheet, segments list, speed control

Implement master steps **11.9–11.11**.

## Detail docs

- [354-full-player-up-next](/docs/proposals/mobile/_master-plan_/details/354-full-player-up-next.md)
- [355-full-player-segments](/docs/proposals/mobile/_master-plan_/details/355-full-player-segments.md)
- [356-playback-speed-control](/docs/proposals/mobile/_master-plan_/details/356-playback-speed-control.md)

## Tasks

1. Up-next sheet: manual upcoming + auto-queue rows from Track 10 stores.
2. Chapters/soundbites list when metadata present; tap uses bounded play (10.17).
3. Speed control → `NativePlaybackBridge.setRate`; reflect current rate in UI.
4. Mark **11.9–11.11** / **354–356** `done`.

## Acceptance

- Empty states i18n; sheet dismissible
- Speed changes audible rate without reload

Do not run tests during agent work.
