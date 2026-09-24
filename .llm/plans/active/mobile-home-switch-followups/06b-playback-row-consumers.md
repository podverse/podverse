# 06b — Rows and row actions read the playback row store

## Goal

Move every per-row playback read to the 06a selector hooks, and make `runPlayAction` read the
snapshot at call time so its identity never changes. After this, a play tap re-renders the old
and new active rows' controls, not every row, and Home's `renderItem` stays stable.

**Prediction:** `rowRenders.playTap` p50 (P6) falls from roughly the number of mounted rows to 2
or fewer. Chips metrics (C6) do not change beyond the noise floor.

## Preconditions

- 06a done.

## Files

- `apps/mobile/src/screens/home/useHomeRowPlayback.ts`
- `apps/mobile/src/screens/home/HomeFeedRow.tsx`
- `apps/mobile/src/components/download/DownloadRowControl.tsx`
- `apps/mobile/src/components/player/MediaRowActions.tsx`

## Step 1 — `useHomeRowPlayback.ts`

1a. Replace `import { usePlaybackIsPlaying, usePlaybackRow } from '../../playback/PlaybackProvider';`
with:

```ts
import {
  getPlaybackRowActions,
  getPlaybackRowSnapshot,
  usePlaybackNoticeKey,
} from '../../playback/playbackRowStore';
```

Delete `import { playbackTargetRowMediaId } from '../../lib/playback/buildPlaybackTarget';`.

1b. Replace this block:

```ts
  const {
    activeTarget,
    noticeKey: playbackNoticeKeyFromEngine,
    pause,
    playClipById,
    playItemById,
    resume,
  } = usePlaybackRow();
  const isPlaying = usePlaybackIsPlaying();
```

with:

```ts
  const playbackNoticeKeyFromEngine = usePlaybackNoticeKey();
```

1c. In `runPlayAction`, replace the whole `void (async () => { … })();` statement and the
dependency array after it (`[activeTarget, isPlaying, pause, playClipById, playItemById, resume]`)
with:

```ts
      void (async () => {
        const { activeMediaId, isPlaying } = getPlaybackRowSnapshot();
        const playback = getPlaybackRowActions();
        if (activeMediaId !== null && activeMediaId === target.idText) {
          if (isPlaying) {
            playback.pause();
          } else {
            await playback.resume();
          }
          return;
        }

        if (target.kind === 'clip') {
          await playback.playClipById(target.idText);
        } else {
          await playback.playItemById(target.idText);
        }
      })();
    },
    []
```

## Step 2 — `HomeFeedRow.tsx`

2a. Delete `import { playbackTargetRowMediaId } from '../../lib/playback/buildPlaybackTarget';`.
Replace `import { usePlaybackRow } from '../../playback/PlaybackProvider';` with
`import { usePlaybackRowSelectedParams } from '../../playback/playbackRowStore';`.

2b. Replace:

```tsx
  const { activeTarget, enclosureSelectedParams } = usePlaybackRow();
  const download = resolveHomeFeedRowDownload(downloadItem, downloadTestID);
  const activeMediaId = activeTarget !== null ? playbackTargetRowMediaId(activeTarget) : null;
  const explicitSelectedParams =
    download !== undefined && activeMediaId === download.item.id_text
      ? enclosureSelectedParams
      : undefined;
```

with:

```tsx
  const download = resolveHomeFeedRowDownload(downloadItem, downloadTestID);
  const explicitSelectedParams = usePlaybackRowSelectedParams(download?.item.id_text ?? null);
```

## Step 3 — `DownloadRowControl.tsx`

3a. Delete `import { playbackTargetRowMediaId } from '../../lib/playback/buildPlaybackTarget';`.
Replace `import { usePlaybackRow } from '../../playback/PlaybackProvider';` with
`import { usePlaybackRowSelectedParams } from '../../playback/playbackRowStore';`.

3b. Replace:

```tsx
  const { activeTarget, enclosureSelectedParams } = usePlaybackRow();
  const activeItemId = activeTarget !== null ? playbackTargetRowMediaId(activeTarget) : null;
  const explicitSelectedParams =
    activeItemId === item.id_text ? enclosureSelectedParams : undefined;
```

with `  const explicitSelectedParams = usePlaybackRowSelectedParams(item.id_text);`.

## Step 4 — `MediaRowActions.tsx`

4a. Replace the import block:

```tsx
import {
  normalizeHomeFeedPlaybackMediaId,
  playbackTargetRowMediaId,
} from '../../lib/playback/buildPlaybackTarget';
import {
  usePlaybackIsPlaying,
  usePlaybackProgress,
  usePlaybackRow,
} from '../../playback/PlaybackProvider';
```

with:

```tsx
import { normalizeHomeFeedPlaybackMediaId } from '../../lib/playback/buildPlaybackTarget';
import { usePlaybackProgress } from '../../playback/PlaybackProvider';
import {
  getPlaybackRowActions,
  usePlaybackRowIsActive,
  usePlaybackRowLabeledEnclosures,
  usePlaybackRowSelectedParams,
  usePlaybackRowShowsPause,
} from '../../playback/playbackRowStore';
```

4b. In `MediaRowActions`, delete this block:

```tsx
  const {
    activeTarget,
    enclosureSelectedParams,
    itemLabeledEnclosures,
    switchEnclosureSelectedParams,
  } = usePlaybackRow();
```

4c. In `MediaRowActions`, replace:

```tsx
  const activeMediaId = activeTarget !== null ? playbackTargetRowMediaId(activeTarget) : null;
  const isActiveRow = activeMediaId !== null && activeMediaId === resolvedPlaybackMediaId;
  const canOpenSourcePicker = isActiveRow && itemLabeledEnclosures.length > 1;
```

with:

```tsx
  const isActiveRow = usePlaybackRowIsActive(resolvedPlaybackMediaId);
  const itemLabeledEnclosures = usePlaybackRowLabeledEnclosures(resolvedPlaybackMediaId);
  const enclosureSelectedParams = usePlaybackRowSelectedParams(resolvedPlaybackMediaId);
  const canOpenSourcePicker = isActiveRow && itemLabeledEnclosures.length > 1;
```

4d. Change `      {canOpenSourcePicker ? (` (the line above `<EnclosureSourcePickerSheet`) to
`      {canOpenSourcePicker && enclosureSelectedParams !== undefined ? (`, and inside that sheet
change `void switchEnclosureSelectedParams(params);` to
`void getPlaybackRowActions().switchEnclosureSelectedParams(params);`.

4e. In `MediaRowIconsLeading`, replace:

```tsx
  const { activeTarget } = usePlaybackRow();
  const isPlaying = usePlaybackIsPlaying();
  const resolvedPlaybackMediaId = normalizeHomeFeedPlaybackMediaId(playbackMediaId);
  const activeMediaId = activeTarget !== null ? playbackTargetRowMediaId(activeTarget) : null;
  const isActiveRow = activeMediaId !== null && activeMediaId === resolvedPlaybackMediaId;
  const showPauseIcon = isActiveRow && isPlaying;
```

with:

```tsx
  const resolvedPlaybackMediaId = normalizeHomeFeedPlaybackMediaId(playbackMediaId);
  const isActiveRow = usePlaybackRowIsActive(resolvedPlaybackMediaId);
  const showPauseIcon = usePlaybackRowShowsPause(resolvedPlaybackMediaId);
```

## Step 5 — Check nothing still reads the old values

```bash
rg -n "usePlaybackRow\(\)|usePlaybackIsPlaying\(\)|activeTarget" apps/mobile/src/components/player/MediaRowActions.tsx apps/mobile/src/components/download/DownloadRowControl.tsx apps/mobile/src/screens/home/HomeFeedRow.tsx apps/mobile/src/screens/home/useHomeRowPlayback.ts
```

Expect no output. If a match remains, it is a read this plan did not list: stop and report it.

## Do not

- Do not change `PlaybackProvider.tsx` in this milestone.
- Do not touch the screens that call `useHomeRowPlayback`; their `runPlayAction` calls keep working.

## Done when

- [ ] Steps 1–5 done; Prettier run on the four files.
- [ ] COPY-PASTA 06b ticked; this file moved to `.llm/plans/completed/mobile-home-switch-followups/`.

## Keep / revert

- **Keep** when P6 `rowRenders.playTap` p50 falls by at least half versus P0, C6 shows no tapUi
  regression beyond the noise floor, and play/pause icons, the active-row progress bar, and the
  source picker on the active row behave as before.
- **Revert** when any icon shows the wrong state, the source picker is missing on the active row,
  or C6 regresses beyond the noise floor. Revert 06b by restoring each replaced block (they are
  quoted above), then 06a by deleting the two new files, the vitest line, and Steps 3a–3d.

## Operator checkpoint — P6 and C6

**Mobile** — unit tests:

```bash
npm --prefix apps/mobile run test -- src/playback
```

Capture **P6** (`play` gesture on the Episodes chip) and then **C6** (`chips`) per
[CHECKPOINT.md](./CHECKPOINT.md). During P6, watch that the play icon flips to pause on the row you
tapped only, and the progress bar shows under that row. Reply `collected P6, C6` with the
impression.
