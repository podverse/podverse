# 104-bridge-load-and-start

**Master step:** 2.25
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Add `loadAndStart(source)` convenience on the native bridge + JS adapter that combines `load` +
  `play` with `{ url, initialSeekSeconds? }`.
- Call sites today use sequential `load` then `play` (`useMediaPlayerResourceUpdate`); migrate
  hot paths to `loadAndStart` where a single atomic start is clearer — keep `load`/`play` for
  prepare-without-play cases.

## Architecture notes

- Document atomicity: if `play` fails after successful `load`, surface error; item may still be
  prepared.
- README currently notes this as future — update when implemented.

## Edge cases

- `initialSeekSeconds` near end: clamp per existing native seek policy / playback-core.
- Called while already playing another URL: same replace semantics as `load`.
- `file://` URLs: works once 2.26 lands (order within phase: either after or with 2.26).

## Acceptance criteria

- `loadAndStart` exists on `NativePlaybackBridge` and native modules.
- Unit-testable command serialization (2.28) covers the payload.
- At least the primary play path can use it without behavior regressions vs load+play.

## Web parity references

- Web media element load+play orchestration
- [082-bridge-method-contract](./082-bridge-method-contract.md)
- `apps/mobile/src/playback/useMediaPlayerResourceUpdate.ts`

## Verification

```bash
# Mobile — play episode; confirm start + seek
npm run mobile:e2e:test -- play-mini-player
```

## Depends on

- 2.3 / 2.11 bridge (`done`)
