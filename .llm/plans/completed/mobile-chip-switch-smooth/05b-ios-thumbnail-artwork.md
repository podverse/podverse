# 05b — iOS list and grid artwork from off-main thumbnails

## Goal

`Image.loadAsync(source, { maxWidth, maxHeight })` decodes a thumbnail on SDWebImage's background
queue, and an `ImageRef` passed as `source` is shown with no main-thread resize. List rows and grid
tiles on iOS switch to that thumbnail, stored in 05a's byte-capped cache.

Unchanged: Android (Glide already decodes at view size off the main thread), animated GIFs (they
stay on today's path so they still animate), headers, players, and viewers.

**Prediction:** `image.load` count per chips capture falls to near zero on iOS; `image.thumb.load`
appears; footprint falls by at least a quarter; first-visit `uiMaxGap` p95 falls. Trade-off: the
first time a cover shows in a session, its art appears one to three frames after the row (the
decode is async); later views are instant from the cache.

## Preconditions

- 05a done.

## Files

- New: `apps/mobile/src/components/primitives/useCoverThumbnail.ts`
- `apps/mobile/src/components/primitives/CoverImage.tsx`
- `apps/mobile/src/screens/home/HomeFeedGridCell.tsx`
- `apps/mobile/src/screens/home/HomeScreen.tsx`
- `apps/mobile/src/screens/browse/BrowseScreen.tsx` (grid edge only; the shared cell needs it)

## Step 1 — `useCoverThumbnail.ts` (new)

```ts
import type { ImageRef } from 'expo-image';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { PixelRatio, Platform } from 'react-native';

import { perfCount } from '../../lib/perf/perfSpans';
import {
  createThumbnailCache,
  isThumbnailEligibleUri,
  thumbnailEdgePx,
} from './coverThumbnailCache';

const thumbnailCache = createThumbnailCache<ImageRef>(async (uri, edgePx) => {
  try {
    const ref = await Image.loadAsync({ uri }, { maxHeight: edgePx, maxWidth: edgePx });
    perfCount('image.thumb.load');
    return ref;
  } catch (error) {
    perfCount('image.thumb.fallback');
    throw error;
  }
});

export type CoverThumbnail =
  | { status: 'off' }
  | { status: 'loading' }
  | { status: 'failed' }
  | { ref: ImageRef; status: 'ready' };

type HeldThumbnail = { key: string; ref: ImageRef | null };

/**
 * iOS list and grid artwork: a thumbnail decoded off the main thread at the displayed pixel size.
 * The plain expo-image path keeps the full-size original and scales it on the main thread each
 * time a cell shows it, which stalls a list that mounts many cells in one commit. Android already
 * decodes at view size off the main thread, so this is `off` there, for animated GIFs, and when no
 * edge is given.
 */
export function useCoverThumbnail(
  uri: string | null,
  edgePoints: number | undefined
): CoverThumbnail {
  const edgePx =
    Platform.OS === 'ios' &&
    uri !== null &&
    isThumbnailEligibleUri(uri) &&
    edgePoints !== undefined &&
    Number.isFinite(edgePoints) &&
    edgePoints > 0
      ? thumbnailEdgePx(edgePoints, PixelRatio.get())
      : null;
  const key = uri !== null && edgePx !== null ? `${edgePx}|${uri}` : null;
  const [held, setHeld] = useState<HeldThumbnail | null>(null);
  const heldForKey = held !== null && held.key === key ? held : null;
  const cached = uri !== null && edgePx !== null ? thumbnailCache.get(uri, edgePx) : null;
  const ref = cached ?? heldForKey?.ref ?? null;
  const failed = ref === null && heldForKey !== null;

  useEffect(() => {
    if (uri === null || edgePx === null || ref !== null || failed) {
      return;
    }
    let isCurrent = true;
    const requestKey = `${edgePx}|${uri}`;
    thumbnailCache.load(uri, edgePx).then(
      (loaded) => {
        if (isCurrent) {
          setHeld({ key: requestKey, ref: loaded });
        }
      },
      () => {
        if (isCurrent) {
          setHeld({ key: requestKey, ref: null });
        }
      }
    );
    return () => {
      isCurrent = false;
    };
  }, [edgePx, failed, ref, uri]);

  if (key === null) {
    return { status: 'off' };
  }
  if (ref !== null) {
    return { ref, status: 'ready' };
  }
  return failed ? { status: 'failed' } : { status: 'loading' };
}
```

## Step 2 — `CoverImage.tsx`

2a. Directly above `import { Image } from 'expo-image';` add
`import type { ImageRef, ImageSource } from 'expo-image';`. Directly after
`import { ImageViewerModal } from './ImageViewerModal';` add
`import { useCoverThumbnail } from './useCoverThumbnail';`.

2b. Replace the doc comment above `decodeEdge?: number;` (the three lines starting
`   * When set, passed to expo-image as the source width/height`) with:

```tsx
   * Displayed edge in points, for list and grid artwork. On iOS the cover shows a thumbnail
   * decoded off the main thread at this size (`useCoverThumbnail`); elsewhere it is passed to
   * expo-image as the source width/height. Omit on full-size surfaces.
```

2c. Directly after the two-line statement that starts `  const displayUri =` add:

```tsx
  const thumbnail = useCoverThumbnail(displayUri, decodeEdge);
```

2d. Replace `  if (displayUri === null || failedUri === displayUri) {` with
`  if (displayUri === null || failedUri === displayUri || thumbnail.status === 'failed') {`.

2e. Replace the three-line statement that starts `  const imageSource =` with:

```tsx
  let imageSource: ImageRef | ImageSource | null = { uri: displayUri };
  if (thumbnail.status === 'ready') {
    imageSource = thumbnail.ref;
  } else if (thumbnail.status === 'loading') {
    imageSource = null;
  } else if (decodeEdge !== undefined && Number.isFinite(decodeEdge) && decodeEdge > 0) {
    imageSource = { height: decodeEdge, uri: displayUri, width: decodeEdge };
  }
```

## Step 3 — Grid tiles get their edge

3a. `HomeFeedGridCell.tsx`: add `artworkEdge?: number;` as the first line of
`type HomeFeedGridCellProps = {`; add `artworkEdge,` as the first destructured prop of
`HomeFeedGridCell`; change
`<CoverImage opensViewer={false} style={styles.artwork} uri={row.imageUrl} />` to
`<CoverImage decodeEdge={artworkEdge} opensViewer={false} style={styles.artwork} uri={row.imageUrl} />`.

3b. `HomeScreen.tsx`, in `function HomeFeedListItem({`: add `artworkEdge,` directly after
`  addToPlaylistPress,`; in its props type add `  artworkEdge: number;` directly after
`  addToPlaylistPress?: (row: HomeFeedRowData) => void;`; change
`<HomeFeedGridCell onPress={onPress} row={row} />` to
`<HomeFeedGridCell artworkEdge={artworkEdge} onPress={onPress} row={row} />`.
In `const renderItem = useCallback(`: add `        artworkEdge={gridCellWidth}` directly after
`        addToPlaylistPress={rowAddToPlaylistPress}`, and add `      gridCellWidth,` directly after
`      feedCellStyle,` in its dependency list. In the unsubscribed-downloads grid, change
`<HomeFeedGridCell` followed by `onPress={handleRowPress}` so the element gets
`artworkEdge={gridCellWidth}` as its first prop.

3c. `BrowseScreen.tsx`, the same pattern: in `function BrowseFeedItem({` add `artworkEdge,`
after `  addToPlaylistPress,`; in its type add `  artworkEdge: number;` after
`  addToPlaylistPress?: (row: HomeFeedRowData) => void;`; change
`<HomeFeedGridCell onPress={onPress} row={row} />` to
`<HomeFeedGridCell artworkEdge={artworkEdge} onPress={onPress} row={row} />`. In
`const renderItem = useCallback(`, add `          artworkEdge={gridCellWidth}` directly after
`          addToPlaylistPress={rowAddToPlaylistPress}` and `      gridCellWidth,` directly after
`      feedCellStyle,` in the dependency list.

## Step 4 — Format and check

```bash
./scripts/nix/with-env npx prettier --write apps/mobile/src/components/primitives/useCoverThumbnail.ts apps/mobile/src/components/primitives/CoverImage.tsx apps/mobile/src/screens/home/HomeFeedGridCell.tsx apps/mobile/src/screens/home/HomeScreen.tsx apps/mobile/src/screens/browse/BrowseScreen.tsx
rg -n "decodeEdge=" apps/mobile/src
rg -n "artworkEdge=\{gridCellWidth\}" apps/mobile/src
```

The first search lists `HomeFeedRow.tsx` and `HomeFeedGridCell.tsx`. The second lists three places
(two in `HomeScreen.tsx`, one in `BrowseScreen.tsx`).

## Do not

- Do not call `release()` on any `ImageRef`.
- Do not change Android behavior, header or player artwork, or `prefetchCoverImage`.
- Do not add a placeholder behind a loading thumbnail (it would flash the fallback icon).

## Done when

- [ ] Steps 1–4 done; outputs match. COPY-PASTA 05b ticked; this file moved to `completed/`.

## Keep / revert

- **Keep** when first-visit `uiMaxGap` p95 or footprint improves beyond the noise floor, no tapUi
  metric regresses beyond it, and the operator sees correct, sharp artwork in list and grid, with
  animated covers still animating.
- **Revert** when artwork is wrong, blurry, or flickers while scrolling, or first-visit
  `listVisible` p95 is worse beyond the noise floor with no `uiMaxGap` gain. Revert = delete
  `useCoverThumbnail.ts` and undo Steps 2–3 by editing (then revert 05a as its file says).

## Operator checkpoint — T5

JS only, no rebuild. Capture **T5** (`chips`) per [CHECKPOINT.md](./CHECKPOINT.md), looking at
artwork sharpness in the list rows as you go. After collecting, switch Podcasts to the other view
mode once to check the artwork there, then put it back so later captures start from the same
state. Reply `collected T5` with the impression, including anything about artwork.
