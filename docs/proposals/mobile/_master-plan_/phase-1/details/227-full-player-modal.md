# 227-full-player-modal

**Master step:** 7.8
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Full player as modal or root stack screen over tabs.
- Opening full player must **not** unmount mini slot host / engine.
- Expand from mini prepares `targetId=full` rect for later animate API (Track 2.22) — stub
  navigation OK this phase.

## Acceptance criteria

- Open/close full player without destroying tab navigator state
- Mini slot remains mounted underneath
- Route name reserved (e.g. `FullPlayer`)

## Web parity references

- Web full player / now-playing expansion patterns

## Verification

```bash
rg -n "FullPlayer|full-player" apps/mobile/src || true
```
