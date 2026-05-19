# Phase 2 — Playback domain types

## Goal

Introduce the typed vocabulary the rest of the refactor speaks: a
`PlaybackTarget` discriminated union, a `PlaybackLoadRequest`, and the pure
sub-helpers the Phase 3 policy will compose. Types and pure helpers only —
no consumer migration.

## Scope

New module tree under `apps/web/src/lib/playback/`.

## Deliverables

### 1. `PlaybackTarget` discriminated union

`apps/web/src/lib/playback/playbackTarget.ts`

```typescript
import type {
  AddByRSSResourceData,
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers';

export type MusicItemPlaybackIntent =
  | 'session_restore'
  | 'explicit_play'
  | 'fresh_transition';

export type PlaybackTarget =
  | { kind: 'clip'; clip: DTOClip; item: DTOItem; channel: DTOChannel }
  | {
      kind: 'soundbite';
      soundbite: DTOItemSoundbite;
      item: DTOItem;
      channel: DTOChannel;
    }
  | {
      kind: 'chapter';
      chapter: DTOItemChapter;
      item: DTOItem;
      channel: DTOChannel;
    }
  | { kind: 'item-podcast'; item: DTOItem; channel: DTOChannel }
  | { kind: 'item-video'; item: DTOItem; channel: DTOChannel }
  | {
      kind: 'item-music';
      item: DTOItem;
      channel: DTOChannel;
      intent: MusicItemPlaybackIntent;
    }
  | { kind: 'add-by-rss'; resourceData: AddByRSSResourceData }
  | { kind: 'livestream'; channel: DTOChannel; item: DTOItem | null };
```

### 2. `PlaybackLoadRequest`

`apps/web/src/lib/playback/playbackLoadRequest.ts`

```typescript
export type PlaybackLoadRequest = {
  target: PlaybackTarget;
  /** Explicit position from the caller (e.g. anonymous snapshot, queue
   *  resource playback_position). Wins over abridged-index lookups. */
  explicitPlaybackSeconds?: number;
  /** Optional caller-known duration hint (used to clamp near-end). */
  mediaFileDurationHintSeconds?: number;
};
```

### 3. Pure sub-helper modules

All under `apps/web/src/lib/playback/`. Each is a small, testable function
the Phase 3 policy composes.

- `clampNearEndSeconds.ts` — single home for the "treat positions within 5s
  of `duration` as 0" rule.
- `parsePlaybackSeconds.ts` — coerce `string | number | null | undefined`
  to a finite number or `undefined`.
- `resumeSeekFromAbridged.ts` — given an abridged `{ p, d }` row and an
  optional explicit override, produce the final seek seconds.

`MusicItemPlaybackIntent` lives on `playbackTarget.ts` (the kind that uses
it) and is re-exported from the package barrel.

### 4. Module barrel

`apps/web/src/lib/playback/index.ts` — single export point for everything
above so consumers import from `'../../lib/playback'`.

### 5. Unit tests

One test file per module under `apps/web/src/lib/playback/__tests__/`.
Coverage targets the matrix from Phase 1: zero duration, near-end clamp,
NaN inputs, missing fields, explicit-overrides-abridged precedence.

## Out of scope

- Calling these from any controller, hook, or context. That is Phase 3.
- Any change to `MediaPlayer.tsx` context shape.
- Removing or renaming the existing
  [`apps/web/src/lib/musicItemPlaybackIntent.ts`](../../../../apps/web/src/lib/musicItemPlaybackIntent.ts),
  [`apps/web/src/lib/musicSessionRestoreCurrentTime.ts`](../../../../apps/web/src/lib/musicSessionRestoreCurrentTime.ts),
  or [`apps/web/src/lib/playbackResumeNearEnd.ts`](../../../../apps/web/src/lib/playbackResumeNearEnd.ts)
  files (Phase 3 deletes them when their callers migrate).

## Exit criteria

- All Phase 2 modules compile and have unit tests.
- `npm run lint -w apps/web` passes.
- `npm run test:unit` passes including the new tests.
- No production code path imports the new modules yet (verified by grep).

## Verification commands

```bash
npm run lint -w apps/web
npm run test:unit
```
