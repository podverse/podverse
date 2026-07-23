# 321-orchestrator-ended-advance

**Master step:** 10.12
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Orchestrate ended event: prefer manual upcoming first, else auto-queue row advance.
- Mobile equivalent of web `NonLiveMediaOrchestrator` end handling.

## Architecture notes

Port decision order from `NonLiveMediaOrchestrator.tsx` `onEnded`. Emit load intents for
10.13–10.14. Audio-first: ignore video surface concerns.

## Edge cases / cross-track deps

- Rapid ended storms from native
- Empty both queues
- Cross-track: requires media engine ended events from spike

## Acceptance criteria

- On ended: if upcoming exists → play next manual; else auto-queue advance; else stop
- Skip uses same advance policy where web does
- No double-advance on duplicate ended events

## Web parity references

- Web: `apps/web/src/components/MediaPlayer/Controller/NonLiveMediaOrchestrator.tsx`
- Tests: `NonLiveMediaOrchestrator.ended.test.tsx`

## Verification

```bash
npm run test -w apps/web
# prefer extracting shared advance pure fn into playback-core if not already
```

## Depends on

- 10.1, 10.7, 10.8
