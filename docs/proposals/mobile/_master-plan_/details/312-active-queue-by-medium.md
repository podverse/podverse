# 312-active-queue-by-medium

**Master step:** 10.3
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Resolve active queue by medium via `getQueueForMedium` from `@podverse/helpers`.
- When media-type preference or available queues change, update `activeQueue` in the store.

## File paths

- Prefer `@podverse/helpers` subpath imports from mobile (never barrel-only if restricted).

## Acceptance criteria

- Active queue matches web selection rules for podcast / video / music media types
- Switching media-type preference updates active queue without full remount
- Missing medium falls back per helpers semantics

## Web parity references

- `packages/helpers/src/lib/queue/queue.ts` — `getQueueForMedium`
- Web: `apps/web/src/contexts/Queue.tsx` active-queue resolution

## Verification

```bash
npm run test -w @podverse/helpers
```

## Depends on

- 10.1 / 310
