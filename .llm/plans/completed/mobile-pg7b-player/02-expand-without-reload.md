# 02 — Expand to full player without reload (audio)

Implement master step **11.4**.

## Detail docs

- [343-expand-without-reload](/docs/proposals/mobile/_master-plan_/details/343-expand-without-reload.md)

## Tasks

1. Mini → `FullPlayer` navigation must not call bridge `destroy` or reload enclosure.
2. Position and play/pause continuous across expand/back (audio).
3. Share player state via context/store — single engine instance.
4. Mark **11.4** / **343** `done`.

## Acceptance

- Expand/collapse audio path has no reload spinner / enclosure re-fetch
- E2E play-mini-player can assert continuity when harness allows

Do not run tests during agent work. Video animate APIs stay deferred (11.6–11.7).
