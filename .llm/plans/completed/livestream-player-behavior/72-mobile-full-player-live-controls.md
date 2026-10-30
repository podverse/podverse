**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 72 — Mobile full player: Live in place of the duration, behind-live time, and a window scrubber

## Rows

R15, R17, R19, R24

## Runs after

11, 52, 71

## Files

apps/mobile/src/components/player/FullPlayerLiveControl.tsx
apps/mobile/src/components/player/FullPlayerScrubber.tsx
apps/mobile/src/screens/player/FullPlayerScreen.tsx

## What the listener sees

A livestream playing on this phone:

- **No duration.** The right-hand slot holds the **Live** control: the word from
  `media.livestream.live`, bold, uppercase, red (`tokens.text.danger`) at the live edge and
  tertiary (`tokens.text.tertiary`) when behind. Pressing it goes to the live moment and plays
  (`goToLive`, plan 71). Its accessible name is `media_player.go_to_live` ("Go to Live").
- **Left-hand time** is empty at the live edge and `−0:42` style when behind it
  (`formatBehindLiveLabel`, plan 11). Its accessible label is `media_player.behind_live`
  ("{time} Behind Live").
- **Scrubber and skip buttons only when the stream can rewind** (`canRewind`, at least 30 s of
  window). The scrubber spans the window; dragging or tapping seeks inside it, clamped.
- **No window, or one too short to rewind:** the progress band holds only the Live control,
  centered. The skip-back and skip-forward slots stay empty (hidden, not disabled).

Everything else on the full player is unchanged. Another device's livestream keeps its existing
non-interactive Live label (`FullPlayerRemoteRegion.tsx`, `full-player-remote-live`).

## Decisions this plan makes

- **Mini player: no change.** `MiniPlayerProgress` shows an empty edge fill for a livestream
  (duration 0 after plan 70), the same as `MiniPlayerRemoteProgress` does for another device's
  livestream. The full player is where the Live control and scrubber live. Web plan 52 shows a
  scrubber on its narrow bar's edge instead; the mobile mini player's edge is a non-interactive
  fill for every item, so mobile keeps that.
- **The live scrubber reuses `FullPlayerScrubberTrack`** with a third source (beside the local and
  remote ones), so gestures, hit target, fill, and thumb match the episode scrubber. No chapter
  marks, highlight, or tooltip (it gets `EMPTY_CHAPTERS` and null clip and soundbite).
- **Hidden, not disabled** for the skip buttons and scrubber, copying web plan 52 (step 06's
  decision).

## Reuse and parity

- Parity source: web plan 52 (`LiveMediaPlayerProgress`, `.liveControl` / `.liveControlAtEdge`,
  `liveOnly` layout). Catalog keys `media_player.go_to_live` and `media_player.behind_live` are
  added by plan 52 in `packages/i18n-catalog/consumer/originals/*.json`, which mobile compiles
  (`shared` → `consumer` → `mobile`). This plan adds no keys.
- The Live-only band copies `FullPlayerRemoteRegion.tsx`'s `progressBand` style (centered, height
  `FULL_PLAYER_PROGRESS_BLOCK_HEIGHT`), so the transport row does not move when a stream gains or
  loses its window.
- Rules come from plan 11 (`resolveLivePlaybackDisplay`, `clampLiveSeekSeconds`,
  `isRewindableLiveWindow`); state and commands from plan 71 (`useLivePlaybackDisplay`,
  `useLivePlaybackWindow`, `useLivePlaybackCanRewind`, `getLivePlaybackDisplay`,
  `getLivePlaybackWindow`, `subscribeLivePlaybackDisplay`, session `goToLive`).

## Change 1 — `apps/mobile/src/components/player/FullPlayerLiveControl.tsx` (new)

```typescript
export function FullPlayerLiveControl(): React.JSX.Element;
```

- Reads `useLivePlaybackDisplay().isAtLiveEdge` (`../../playback/livePlaybackStore`),
  `usePlaybackSession().goToLive` (`../../playback/PlaybackProvider`), `useTranslation()`, and
  `useTheme()` (`../../theme/useTheme`, `tokens`).
- Renders a `Pressable` (React Native) with `accessibilityRole="button"`,
  `accessibilityLabel={t('media_player.go_to_live')}`, `hitSlop` of `tokens.spacing.md` on all four
  sides, `onPress={() => { void goToLive(); }}`, `testID="full-player-live-control"`, and a
  pressed style of `opacity: 0.6`.
- Inside, one `Text` with `t('media.livestream.live')`, styles: `fontSize: 14`, `lineHeight: 18`
  (the scrubber's `timeText` metrics), `fontWeight: '700'`, `textTransform: 'uppercase'`, `color`
  `tokens.text.danger` when `isAtLiveEdge`, else `tokens.text.tertiary`.
- Styles in a `useMemo(() => StyleSheet.create(…), [tokens])`, as in the other player components.
- A `Pressable` with a `Text` instead of the `Button` primitive: `Button` has no color input, and
  the control's color is its live-edge state.
- Doc comment (one or two lines): the Live control in a livestream's progress band; red at the live
  edge; pressing it goes to the live moment and plays.

## Change 2 — `apps/mobile/src/components/player/FullPlayerScrubber.tsx`

### 2a — source contract

- `import type { ReactNode } from 'react';` (separate type-import line, **type-imports-separate-line**).
- Add above `FullPlayerScrubberSource`:

```typescript
type FullPlayerScrubberLive = {
  /** Rendered in the duration slot. */
  liveControl: ReactNode;
};
```

- Add a field to `FullPlayerScrubberSource`:

```typescript
  /**
   * A livestream's window. `durationSeconds` is then the window's length and the clocks are
   * seconds into it; the left clock shows the behind-live time and the right slot the Live control.
   */
  live: FullPlayerScrubberLive | null;
```

- In `FullPlayerScrubber` and `FullPlayerRemoteScrubber`, add `live: null` to their `source`
  objects.

### 2b — stable seek and tooltip callbacks

The live window's length changes with every segment, so `durationSeconds` changes while the
listener may be dragging. `commitSeek` and `showChapterTooltip` must not depend on it, or the pan
and long-press gestures are rebuilt mid-drag.

- Add `const durationSecondsRef = useRef(durationSeconds);` next to `durationShared`.
- In the existing effect `useEffect(() => { durationShared.value = durationSeconds; }, …)`, also
  assign `durationSecondsRef.current = durationSeconds;`.
- `commitSeek`: read `const duration = durationSecondsRef.current;` and use it in place of
  `durationSeconds`; dependency array becomes `[seekTo]`.
- `showChapterTooltip`: pass `durationSecondsRef.current` to `getChapterAtPercent`; drop
  `durationSeconds` from its dependency array.
- In the track's doc comment, after "rebuilding a Gesture mid-drag re-attaches the recognizer and
  floods JS.", add: "Seek and tooltip callbacks read the duration from a ref for the same reason,
  since a livestream's window grows while it plays."

### 2c — live time row and accessibility value

Inside `FullPlayerScrubberTrack`, after `const displayDuration = …`, add:

```typescript
  const live = source.live;
  const liveTime =
    live === null
      ? null
      : resolveLivePlaybackDisplay({
          positionSeconds: displayPositionSeconds,
          window: { startSeconds: 0, liveEdgeSeconds: durationSeconds },
        });
  const behindLiveText =
    liveTime === null || liveTime.behindLiveLabel === null
      ? null
      : t('media_player.behind_live', { time: formatHHMMSS(liveTime.behindLiveSeconds) });
```

(`resolveLivePlaybackDisplay` from `@podverse/playback-core/livePlayback`. Seconds into the
window against a window of `[0, length]` gives the same behind time and tolerance as the real
window, and follows the drag preview.)

- `accessibilityValue.text`: when `live !== null`, `behindLiveText ?? t('media.livestream.live')`;
  otherwise the existing `media_player.position_of_duration` string.
- Time row: when `live === null`, the existing two `Text` nodes unchanged. When `live !== null`:

```tsx
        {behindLiveText !== null && liveTime !== null ? (
          <Text
            accessibilityLabel={behindLiveText}
            style={styles.timeText}
            testID="full-player-live-behind"
          >
            {liveTime.behindLiveLabel}
          </Text>
        ) : (
          <View />
        )}
        {live.liveControl}
```

  The empty `View` keeps the Live control on the right under `justifyContent: 'space-between'`.
  The live row has no `full-player-position` or `full-player-duration` node.

### 2d — `FullPlayerLiveScrubber` (local, not exported)

Add after `FullPlayerScrubber`:

```tsx
const getLiveWindowRatio = (): number => getLivePlaybackDisplay().windowFraction ?? 1;

/** A livestream's rewindable window on this phone. The Live control sits in the duration slot. */
function FullPlayerLiveScrubber() {
  const { seekTo } = usePlaybackSession();
  const display = useLivePlaybackDisplay();
  const liveWindow = useLivePlaybackWindow();
  const windowSeconds =
    liveWindow === null ? 0 : liveWindow.liveEdgeSeconds - liveWindow.startSeconds;
  const clockSeconds = Math.floor((display.windowFraction ?? 1) * windowSeconds);
  const seekIntoWindow = useCallback(
    (secondsIntoWindow: number) => {
      const current = getLivePlaybackWindow();
      if (!isRewindableLiveWindow(current)) {
        return;
      }
      seekTo(clampLiveSeekSeconds(current, current.startSeconds + secondsIntoWindow));
    },
    [seekTo]
  );
  const live = useMemo((): FullPlayerScrubberLive => ({ liveControl: <FullPlayerLiveControl /> }), []);
  const source = useMemo(
    (): FullPlayerScrubberSource => ({
      durationSeconds: windowSeconds,
      clockSeconds,
      getRatio: getLiveWindowRatio,
      subscribeRatio: subscribeLivePlaybackDisplay,
      seekTo: seekIntoWindow,
      clip: null,
      soundbite: null,
      live,
    }),
    [clockSeconds, live, seekIntoWindow, windowSeconds]
  );

  return <FullPlayerScrubberTrack chapters={EMPTY_CHAPTERS} source={source} />;
}
```

`seekTo` from `usePlaybackSession()` is the routed seek; a livestream on another device never
renders this component, so it always reaches the local `seekTo`.

While dragging, the track writes seconds into the window to `playbackScrubPreviewStore`. Its other
readers (`useNowPlayingChapters`, `FullPlayerSegmentBand`, `NowPlayingSegmentBar`) only map it onto
chapters, and a livestream has none, so leave them as they are.

### 2e — `FullPlayerLiveProgress` (exported)

```tsx
/**
 * A livestream's progress band on this phone: the window scrubber when the stream can rewind,
 * else the Live control alone, centered at the same height.
 */
export function FullPlayerLiveProgress({ canRewind }: { canRewind: boolean }) {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        liveOnlyBand: {
          alignItems: 'center',
          height: FULL_PLAYER_PROGRESS_BLOCK_HEIGHT,
          justifyContent: 'center',
          width: '100%',
        },
      }),
    []
  );
  if (canRewind) {
    return <FullPlayerLiveScrubber />;
  }
  return (
    <View style={styles.liveOnlyBand} testID="full-player-live-progress-block">
      <FullPlayerLiveControl />
    </View>
  );
}
```

(Hooks run before the early return, so the order is stable.)

Imports to add: `FullPlayerLiveControl` from `./FullPlayerLiveControl`; value imports
`clampLiveSeekSeconds`, `isRewindableLiveWindow`, `resolveLivePlaybackDisplay` from
`@podverse/playback-core/livePlayback`; `getLivePlaybackDisplay`, `getLivePlaybackWindow`,
`subscribeLivePlaybackDisplay`, `useLivePlaybackDisplay`, `useLivePlaybackWindow` from
`../../playback/livePlaybackStore`. Keep the file's import grouping.

Update the doc comment above `FullPlayerScrubberTrack` that names the two scrubbers
("`FullPlayerScrubber` is this phone's playback. `FullPlayerRemoteScrubber` is another device's.")
to also name `FullPlayerLiveProgress` as this phone's livestream band.

## Change 3 — `apps/mobile/src/screens/player/FullPlayerScreen.tsx`

Large file; edit only these anchors.

- Imports: change `import { FullPlayerScrubber } from '../../components/player/FullPlayerScrubber';`
  to import `{ FullPlayerLiveProgress, FullPlayerScrubber }`. Add
  `import { isLivePlaybackTarget } from '../../playback/crossDevice/crossDevicePlaybackPolicy';`
  and `import { useLivePlaybackCanRewind } from '../../playback/livePlaybackStore';` in the file's
  import order.
- Directly after the `} = usePlaybackSession();` destructure (the one that includes
  `activeTarget`, `jumpBy`, `transportState`), add:

```typescript
  const isLiveNowPlaying = activeTarget !== null && isLivePlaybackTarget(activeTarget);
  const liveCanRewind = useLivePlaybackCanRewind();
```

- In the local player region, replace

```tsx
            <View pointerEvents="auto">
              <FullPlayerScrubber chapters={chapters} />
            </View>
```

with

```tsx
            <View pointerEvents="auto">
              {isLiveNowPlaying ? (
                <FullPlayerLiveProgress canRewind={liveCanRewind} />
              ) : (
                <FullPlayerScrubber chapters={chapters} />
              )}
            </View>
```

- On the local `<FullPlayerTransportRow` directly below (the one whose `onJumpBack` calls
  `jumpBy(-MEDIA_JUMP_BACK_SECONDS)` and that passes `state={transportState}`), add
  `hideJumpButtons={isLiveNowPlaying && !liveCanRewind}`. Do not touch the remote region's
  transport row (in `FullPlayerRemoteRegion.tsx`), which already passes `hideJumpButtons`.

## Tests

No unit test in this plan: the rules are plan 11's (tested in `livePlayback.test.ts`) and the
state is plan 71's (tested in `livePlaybackStore.test.ts`); what is left is layout and wiring,
which plan 73's Maestro flow holds (Live control present, duration absent, behind time after a
skip back, Live press clears it, scrubber and skip buttons hidden without a rewindable window).

Existing flows that assert `full-player-scrubber`, `full-player-position`, `full-player-duration`,
and the jump buttons (`player-screen`, `play-mini-player`, `track`, `make-clip`,
`playback-multi-device-handoff`, `video-transition`) play episodes, so their nodes are unchanged.

## Release scratchpad

```markdown
## Mobile full player shows Live, the time behind live, and a rewind scrubber for livestreams

- Surfaces: mobile
- Change: A livestream playing on the phone shows a Live control where an episode shows its
  duration. It is red at the live moment; pressing it goes to the live moment and plays. When
  behind live, the left-hand time reads like −0:42. When the stream keeps a rewindable window
  (HLS, 30 seconds or more), the scrubber spans that window and the skip buttons appear; without
  one (progressive audio, or a very short window), the band shows only the Live control and the
  skip buttons are hidden. The mini player is unchanged.
- Who notices: mobile listeners of livestreams
- Operator steps: none
```
