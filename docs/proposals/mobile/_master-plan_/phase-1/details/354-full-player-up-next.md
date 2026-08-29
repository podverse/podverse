# 354-full-player-up-next

**Master step:** 11.9
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Full player queue/up-next sheet showing manual + auto-queue rows.

## File paths

- Full player screen + queue/auto-queue hooks

## Acceptance criteria

- Sheet lists upcoming manual then auto-queue rows
- Tap row can play/skip per product rules
- Empty states copy via i18n

## Web parity references

- Web up-next / queue peek in media player
- Mobile queue store + auto-queue store (Track 10)

## Verification

```bash
npm run mobile:e2e:test -- play-mini-player
```

## Depends on

- 11.5, 10.1, 10.8

## Implementation notes

- `apps/mobile/src/screens/player/FullPlayerUpNext.tsx` — toggled inline from the full player's
  `full-player-up-next` entry button. Lists manual upcoming rows (server queue via
  `usePrimaryQueue` + `useQueueResources`) then seeded auto-queue rows (`useAutoQueue`). Rows carry
  `item-`/`clip-` id prefixes so tapping play routes through `useHomeRowPlayback` (shared
  orchestrator). Empty state uses `media_player.up_next_empty`; section headings reuse
  `media_player.up_next` / `media_player.auto_queue`.
- testIDs: `full-player-up-next-sheet`, `full-player-up-next-empty`, `full-player-up-next-manual`,
  `full-player-up-next-auto`.
