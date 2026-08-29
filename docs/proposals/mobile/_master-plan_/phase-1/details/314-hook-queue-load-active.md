# 314-hook-queue-load-active

**Master step:** 10.5
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Implement RN equivalent of web `useQueueResourcesLoadActive`.
- Coordinated load of active queue resources after store hydrate / medium change.

## Architecture notes

Port semantics from `apps/web/src/hooks/useQueueResourcesLoadActive.tsx`. Mobile version
composes repository + queue store; do not fetch in screen components.

## Edge cases / cross-track deps

- Medium switch mid-flight: cancel or ignore stale responses
- Cross-track: feeds 10.12–10.14 orchestrator and Track 11 mini player

## Acceptance criteria

- Hook API mirrors web result shape enough for player/orchestrator consumers
- Idempotent under React Strict Mode / focus remounts
- Errors mapped to user-visible/retryable state

## Web parity references

- Web: `apps/web/src/hooks/useQueueResourcesLoadActive.tsx`

## Verification

```bash
npm run mobile:e2e:test -- library
```

## Depends on

- 10.1–10.4
