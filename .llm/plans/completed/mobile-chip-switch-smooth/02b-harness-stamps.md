# 02b — Harness stamps on chips, Home, Browse, rows, and artwork

## Goal

Use the 02a helpers where the user sees things change:

- every chip press notes its release time; the chip row stamps the frame that shows the new chip;
- Home and Browse stamp the first frame showing the spinner and the first frame showing the list;
- the initial chip is marked (so the report knows where the first tap came from);
- play taps and row renders are marked/counted (06 and 07 are judged on them);
- `image.load` marks only a new largest edge, so artwork loads stop flooding the timeline.

## Preconditions

- 02a done (`notePerfTouch`, `stampPerfFrame` exist in `perfFrames.ts`).

## Files

- `apps/mobile/src/components/form/SectionChipRow.tsx`
- `apps/mobile/src/screens/home/HomeScreen.tsx`
- `apps/mobile/src/screens/browse/BrowseScreen.tsx`
- `apps/mobile/src/screens/home/HomeFeedRow.tsx`
- `apps/mobile/src/components/primitives/CoverImage.tsx`
- `scripts/mobile/perf-report.mjs`

## Step 1 — `SectionChipRow.tsx`

1a. Change `import { useMemo } from 'react';` to `import { useLayoutEffect, useMemo } from 'react';`.
Add `import { notePerfTouch, stampPerfFrame } from '../../lib/perf/perfFrames';` directly above
`import { perfMark } from '../../lib/perf/perfSpans';`.

1b. In `SectionChip`, replace `onPress={onPress}` with:

```tsx
      onPress={(event) => {
        notePerfTouch(event.nativeEvent.timestamp);
        onPress();
      }}
```

1c. In `SectionChipRow`, directly after the `const styles = useMemo(…);` statement add:

```tsx

  // Runs in the commit that first shows the newly selected chip.
  useLayoutEffect(() => {
    stampPerfFrame('chip.visible');
  }, [selectedKey]);
```

## Step 2 — `HomeScreen.tsx`

2a. Change the line
`import { beginPerfChipSample, endPerfChipSample } from '../../lib/perf/perfFrames';` to
`import { beginPerfChipSample, endPerfChipSample, stampPerfFrame } from '../../lib/perf/perfFrames';`

2b. Find the effect that calls `readPreferredMediaType()`. Inside its `try`, directly after the
block `if (!isMounted) {\n          return;\n        }` add:

```tsx
        perfMark('home.chip.initial', storedMediaType ?? DEFAULT_HOME_MEDIA_TYPE);
```

In the same effect's `catch (error) {` block, after the `appendHomeFeedReadFailure({ … });` call, add:

```tsx
        perfMark('home.chip.initial', DEFAULT_HOME_MEDIA_TYPE);
```

2c. Find `const handlePlayPress = useCallback(`. Make this the first statement inside its callback
body: `perfMark('home.play.tap', selectedMediaType);`

2d. Directly after the line `  const isSwitchPending = pendingMediaType !== null;` add:

```tsx

  const showsLoading = isSwitchPending || (isFeedBusy && feedRows.length === 0);

  useLayoutEffect(() => {
    if (showsLoading) {
      stampPerfFrame('spinner.visible');
    }
  }, [showsLoading]);

  useLayoutEffect(() => {
    if (!isSwitchPending && hasCompletedFeedRead) {
      stampPerfFrame('list.visible');
    }
  }, [feedRows, hasCompletedFeedRead, isSwitchPending]);
```

## Step 3 — `BrowseScreen.tsx`

3a. Add `import { stampPerfFrame } from '../../lib/perf/perfFrames';` directly above
`import { perfMark } from '../../lib/perf/perfSpans';`.

3b. Find the effect that contains `const readPrefs = async () => {` and `readBrowseListPrefs()`.
Directly above `const readPrefs = async () => {` add `let hasMarkedInitialChip = false;`. Inside
`readPrefs`, directly after its `if (!isMounted) {\n        return;\n      }` block, add:

```tsx
      if (!hasMarkedInitialChip) {
        hasMarkedInitialChip = true;
        perfMark('browse.chip.initial', stored.mediaType);
      }
```

3c. Directly above the line `  if (offlineModeEnabled) {` (the early return near the end of
`BrowseScreen`) add:

```tsx
  const showsLoading = isSwitchPending || (isFeedLoading && !isCategoryView);

  useLayoutEffect(() => {
    if (showsLoading) {
      stampPerfFrame('spinner.visible');
    }
  }, [showsLoading]);

  useLayoutEffect(() => {
    if (!isSwitchPending && !isFeedLoading && !isCategoryView) {
      stampPerfFrame('list.visible');
    }
  }, [directoryFeed, isCategoryView, isFeedLoading, isSwitchPending]);

```

## Step 4 — `HomeFeedRow.tsx`

Directly after the mount effect

```tsx
  useEffect(() => {
    perfCount('home.row.mount');
  }, []);
```

add the line `  perfCount('home.row.render');`.

## Step 5 — `CoverImage.tsx`

5a. Directly above the doc comment that begins `/**` and ` * Square cover / artwork.` add:

```tsx
// Only a new largest edge is marked, which keeps the timeline small; the counter counts every load.
let largestLoggedImageEdge = 0;

const noteImageLoad = (width: number, height: number): void => {
  perfCount('image.load');
  const maxEdge = Math.max(width, height);
  if (!Number.isFinite(maxEdge) || maxEdge <= largestLoggedImageEdge) {
    return;
  }
  largestLoggedImageEdge = maxEdge;
  perfMark('image.load', `maxEdge=${maxEdge}`);
};

```

5b. Replace the whole `onLoad={(event) => { … }}` prop of the `Image` inside `const image = …` with:

```tsx
      onLoad={(event) => {
        noteImageLoad(event.source.width, event.source.height);
      }}
```

## Step 6 — `scripts/mobile/perf-report.mjs`

In `function collectIosLog`, replace the `--predicate` value (the template string that starts
`` `process == "PodverseNext" AND subsystem == "com.facebook.react.log" ``) with:

```js
      `process == "PodverseNext" AND eventMessage CONTAINS "${PERF_LOG_TAG}" AND (subsystem == "com.facebook.react.log" OR subsystem == "com.podverse.perf")`,
```

## Do not

- Do not change any `testID` or accessibility prop.
- Do not remove `perfMark('chip.pressin', testID)`.
- Do not add other stamps than the ones listed.

## Done when

- [ ] Steps 1–6 applied; Prettier run on the changed files.
- [ ] `rg -n "stampPerfFrame\('" apps/mobile/src` shows `chip.visible` (1), `spinner.visible` (2),
      `list.visible` (2).
- [ ] COPY-PASTA 02b ticked; this file moved to `.llm/plans/completed/mobile-chip-switch-smooth/`.

## Operator checkpoint

No capture yet (03 adds the report sections that read these marks). Optional unit check in
**Mobile**:

```bash
npm --prefix apps/mobile run test -- src/lib/perf
```

Then paste prompt 03a.
