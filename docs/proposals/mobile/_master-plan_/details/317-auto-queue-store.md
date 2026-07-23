# 317-auto-queue-store

**Master step:** 10.8
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Implement auto-queue store mirroring web `AutoQueueProvider`.
- Own config, resources map, active row; persist prefs in 10.11.

## Architecture notes

Mirror `apps/web/src/contexts/AutoQueue.tsx`. Auto-queue fills when manual upcoming is empty
(orchestrator 10.12).

## Edge cases / cross-track deps

- Playlist vs channel source modes (10.9–10.10)
- Track 12 may later project auto-queue into native cache via 10.22

## Acceptance criteria

- Provider/hooks expose config, resources, active row + setters
- Helpers like `checkIsActiveRowHighestKey` / `autoQueueIncrementActiveRow` reused or ported
- Clear separation from manual upcoming queue

## Web parity references

- Web: `apps/web/src/contexts/AutoQueue.tsx`

## Verification

```bash
npm run test -w @podverse/playback-core
```

## Depends on

- 10.1
