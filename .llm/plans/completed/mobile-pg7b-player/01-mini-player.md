# 01 — Mini player UI + layout

Implement master steps **11.1–11.2**.

## Detail docs

- [340-mini-player-ui](/docs/proposals/mobile/_master-plan_/details/340-mini-player-ui.md)
- [341-mini-player-layout](/docs/proposals/mobile/_master-plan_/details/341-mini-player-layout.md)

## Tasks

1. Replace `MiniPlayerSlot` placeholder with artwork, title, play/pause, progress, expand control
   bound to now-playing + bridge.
2. Keep `testID="mini-player"`.
3. Fix above tab bar with safe-area; hide when no now-playing; keyboard inset safe.
4. Mark **11.1–11.2** / **340–341** `done`.

## Acceptance

- Play/pause toggles engine; progress updates; expand navigates to full player route
- Does not cover tab labels incorrectly

Do not run tests during agent work. Do **not** implement 11.3 video placeholder.
