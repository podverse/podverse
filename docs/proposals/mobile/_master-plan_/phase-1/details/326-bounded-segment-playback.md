# 326-bounded-segment-playback

**Master step:** 10.17
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Clip/soundbite/chapter bounded play with `pauseAt` (replace `useClipPlaybackStub`).

## Architecture notes

Web clip/soundbite/chapter header play sections set bounded windows. Mobile clip stub today
only notices — replace with real bridge seeks + pauseAt.

## Edge cases / cross-track deps

- Seek beyond bound
- Ending mid-bound vs natural end advance

## Acceptance criteria

- Bounded play starts at startTime and pauses/stops at endTime/pauseAt
- Queue add still works for clips
- Native timer or position observer enforces bound

## Web parity references

- Web: Clip/ItemSoundbite/ItemChapter header play sections
- Mobile: `apps/mobile/src/screens/clip/useClipPlaybackStub.ts`

## Verification

```bash
npm run mobile:e2e:test -- podcast-episode
```

## Depends on

- 10.14
