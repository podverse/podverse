# 09b — Keep recent Home lists mounted, so a chip tap never waits for an unmount

## Goal

The main fix. Today every switch unmounts ~20 heavy rows and mounts the next list in one commit,
so the chip cannot paint until the old rows are torn down (leaving Episodes is the slowest case).
With kept lists:

- A tap commits one small change: the chip becomes active and the chosen list is shown. A list
  seen recently is revealed exactly as it was left (rows and scroll position); a new list mounts
  on its loading spinner. **Nothing unmounts during a tap.**
- At most **3** lists stay mounted, most recently shown first. Extra lists are dropped only after
  taps pause for **1.5 s**, never during a tap.
- An iOS memory warning drops every hidden list. Any change of sign-in state, account, or offline
  mode drops every hidden list (they hold rows read for the old identity).
- Hidden lists never read (09a). Anything that would have reloaded them marks them stale, and they
  reload quietly when shown.
- Hidden lists are `opacity: 0`, ignore touches, and are hidden from screen readers
  (`accessibilityElementsHidden` on iOS, `importantForAccessibility="no-hide-descendants"` on
  Android). The chip-switch tap dismisses the keyboard, because a hidden list keeps its filter
  field mounted.
- Remembered choices become per media type (`prefsByType`), so a revisit needs no storage read and
  hidden lists never receive another type's choices.
- The pending overlay, its extra frame, and `commitMediaTypeChange` go away.
- E2E keeps one list (`keptListPolicy(isMobileE2eFromEnv())`), so flows see the same single list
  they always have.

**Prediction:** revisits: chip and list in the same frame (`listVisible − chipVisible` ≤ 17 ms),
`chipVisible` p95 ≤ 34 ms, no revisit tap with a UI gap ≥ 100 ms. First visits: chip and spinner in
the same frame. Footprint grows by the hidden lists (expect under +150 MB with 05's thumbnails).

## Preconditions

- 09a done (`isActive` exists on `HomeMediaTypeList`; `keptLists.ts` exists).

## Files

- `apps/mobile/src/screens/home/HomeScreen.tsx`
- Plan input: `.llm/plans/active/mobile-home-switch-followups/tools/home-kept-lists-b.edits`

## Step 1 — Back up the screen

```bash
cp apps/mobile/src/screens/home/HomeScreen.tsx .llm/plans/active/mobile-home-switch-followups/backup/HomeScreen.pre09b.tsx.txt
```

## Step 2 — Apply the screen edits

```bash
./scripts/nix/with-env node .llm/plans/active/mobile-home-switch-followups/tools/move-blocks.mjs apply-edits .llm/plans/active/mobile-home-switch-followups/tools/home-kept-lists-b.edits
```

Expect 23 `applied …` lines. If it fails it writes nothing: stop and report the output.

## What the edits do (for review)

1. **Imports:** add `AppState`, `Keyboard`, `useAuth`, `isMobileE2eFromEnv`, the three kept-list
   helpers, and `useOfflineMode`; drop `VerticalCenter`, `ListLoading`, and `stampPerfFrame`
   (the list stamps its own spinner).
2. **Module scope:** `HomePrefsByType`, `HOME_KEPT_LIST_POLICY`, `isSameListPrefs`, and
   `patchListPrefs` (applies a choice to one type; a type not read yet stays unread).
3. **State:** `account` / `status` / `offlineModeEnabled`; `keptMediaTypes` (starts with the default
   type); `prefsByType` replaces `listPrefs`; `activeListRef` replaces `listRef`; the pending state
   and frame ref go away.
4. **Prefs:** `resolvePrefs(mediaType)` falls back to defaults, carrying the view mode of the list
   the user came from (`keptMediaTypes[1]`) so rows do not change shape while storage answers.
   `storeListPrefs` writes one type and skips the update when nothing changed. The sort, range, and
   view-mode handlers patch only the selected type.
5. **Hydration:** the stored media type also becomes the first kept list.
6. **Removed:** the pending-frame effect, the unmount cleanup for it, `commitMediaTypeChange`, the
   screen's spinner stamp, `displayedMediaType`, `isSwitchPending`, and the overlay styles.
7. **Tap handler:**

```tsx
  const handleMediaTypeChange = useCallback(
    (mediaType: HomeMediaType) => {
      perfMark('home.chip.tap', mediaType);
      if (mediaType === selectedMediaType) {
        return;
      }
      if (keptMediaTypes.includes(mediaType)) {
        perfMark('home.visit.revisit', mediaType);
      }
      beginPerfChipSample();
      // A hidden list keeps its views, so a focused filter field would hold the keyboard up for an
      // input nobody can see.
      Keyboard.dismiss();
      // One commit selects the chip and shows its list: a kept list as it was left, a new one on its
      // loading spinner. Outside E2E nothing unmounts here; lists past the limit go once taps pause.
      setSelectedMediaType(mediaType);
      setKeptMediaTypes((kept) => showKeptList(kept, mediaType, HOME_KEPT_LIST_POLICY));
      void writePreferredMediaType(mediaType);
    },
    [keptMediaTypes, selectedMediaType]
  );
```

8. **Three effects** above the title-bar effect: the idle-delay trim (a new timer on every change
   of `keptMediaTypes`, so it fires only after taps pause), the `memoryWarning` listener (trim to
   one), and the identity check (`status|account id|offline`, trim to one when it changes).
9. **Render:** one absolute-fill layer per mounted list, in `HOME_MEDIA_TYPE_ORDER` so React never
   reorders native views. The selected list always renders, even if the kept list were ever out of
   step with the selection:

```tsx
        {HOME_MEDIA_TYPE_ORDER.map((mediaType) => {
          const isActive = mediaType === selectedMediaType;
          if (!isActive && !keptMediaTypes.includes(mediaType)) {
            return null;
          }
          return (
            <View
              accessibilityElementsHidden={!isActive}
              importantForAccessibility={isActive ? 'auto' : 'no-hide-descendants'}
              key={mediaType}
              pointerEvents={isActive ? 'auto' : 'none'}
              style={isActive ? styles.listLayer : styles.listLayerHidden}
            >
              <HomeMediaTypeList
                arePrefsHydrated={prefsByType[mediaType] !== undefined}
                isActive={isActive}
                mediaType={mediaType}
                onCanMarkAllSeenChange={setCanMarkAllSeen}
                prefs={resolvePrefs(mediaType)}
                ref={isActive ? activeListRef : undefined}
                requestAddToPlaylist={requestAddToPlaylist}
              />
            </View>
          );
        })}
```

## Step 3 — Format and check

```bash
./scripts/nix/with-env npx prettier --write apps/mobile/src/screens/home/HomeScreen.tsx
rg -n "pendingMediaType|commitMediaTypeChange|listPrefs\b|setListPrefs" apps/mobile/src/screens/home/HomeScreen.tsx
rg -n "memoryWarning|Keyboard.dismiss|showKeptList|trimKeptLists" apps/mobile/src/screens/home/HomeScreen.tsx
```

The first search prints nothing. The second prints at least one line for each of the four names.

## Do not

- Do not use `display: 'none'`, a `key` change, or conditional rendering to hide a kept list; it
  must keep its native views.
- Do not trim kept lists inside the tap handler or in an effect that runs in the tap's commit
  (outside E2E). Unmounting is the cost this milestone removes from the tap.
- Do not change `HomeMediaTypeList.tsx` here.

## Done when

- [ ] Steps 1–3 done; outputs match.
- [ ] COPY-PASTA 09b ticked; this file moved to `.llm/plans/completed/mobile-home-switch-followups/`.

## Keep / revert

- **Keep** when C9a and C9b together meet the revisit prediction (same-frame list, `chipVisible`
  p95 ≤ 34 ms or better than C8 beyond the noise floor, no revisit tap with a gap ≥ 100 ms), first
  visits show the spinner in the chip's frame, footprint is under C8 + 150 MB, the Maestro `home`
  flows pass, and the operator's manual checks below pass.
- **Revert** when rows from the wrong chip appear, a kept list stays stale after a sync or refresh,
  footprint exceeds C8 + 150 MB, a Maestro `home` flow fails because of kept lists, or revisits are
  not better than C8 beyond the noise floor. Revert = copy
  `backup/HomeScreen.pre09b.tsx.txt` back over `HomeScreen.tsx` (09a stays; it is inert with one
  always-active list). Then stop and ask before 10.

## Operator checkpoint — C9a, C9b

JS only, no rebuild. Capture **C9a** and then **C9b** (both `chips`) per
[CHECKPOINT.md](./CHECKPOINT.md). Then, still on `"iPhone 17 Pro"`, check by hand:

1. On Episodes, scroll down a few rows, tap Artists, tap Episodes: same rows, same scroll position.
2. Pull to refresh on Episodes, switch away and back: the list still looks current.
3. Tap Episodes, Artists, Albums, Tracks, then wait 3 s and tap Episodes: it shows its spinner or
   rows at once (it may have been dropped as the least recent list; that is expected).
4. Type in the filter on one chip, tap another chip: the keyboard closes.

Then run the Maestro `home` flows as [CHECKPOINT.md § Maestro run](./CHECKPOINT.md#maestro-run)
describes. Reply `collected C9a C9b` with the impression, the manual-check results, and the Maestro
result.
