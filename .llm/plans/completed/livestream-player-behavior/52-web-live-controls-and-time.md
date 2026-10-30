**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 52 — Web: Live control, behind-live time, live scrubber, and skip buttons

## Rows

R14, R16, R18, R22

## Runs after

50, 51, 53

## Files

apps/web/src/components/MediaPlayer/Sliders/LiveMediaPlayerProgress.tsx
apps/web/src/components/MediaPlayer/Sliders/LiveMediaPlayerProgress.test.tsx
apps/web/src/components/MediaPlayer/Sliders/MediaPlayerProgress.tsx
apps/web/src/styles/components/MediaPlayer/Sliders/MediaPlayerProgress.module.scss
apps/web/src/components/MediaPlayer/Desktop/MediaPlayerControlsDesktop.tsx
apps/web/src/components/MediaPlayer/Modal/MediaPlayerControlsModal.tsx
apps/web/src/components/MediaPlayer/Mobile/MediaPlayerButtonsMobile.tsx
apps/web/src/components/MediaPlayer/Mobile/MediaPlayerControlsMobile.tsx
apps/web/src/hooks/useShowJumpButtons.ts
apps/web/src/hooks/usePlayerTransport.ts
apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx
apps/web/src/components/MediaPlayer/Controller/mediaPlayerWindowKeyDown.ts
apps/web/src/components/MediaPlayer/Controller/mediaPlayerWindowKeyDown.test.ts
packages/i18n-catalog/consumer/originals/en-US.json
packages/i18n-catalog/consumer/originals/es.json
packages/i18n-catalog/consumer/originals/fr.json
packages/i18n-catalog/consumer/originals/el-GR.json
apps/web/e2e/media-player-livestream-live-controls.spec.ts
apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md
release-notes/scratchpad.md

## Goal

For a live resource playing in this tab, the player shows:

- **Duration slot (right):** the Live control, a button whose visible text is the word Live
  (`media.livestream.live`). Pressing it goes to the current live moment and plays (R14, R16).
- **Time slot (left):** nothing at the live point; `−0:42` (minus sign U+2212 and the clock) when
  behind live (R18).
- **Scrubber and skip buttons:** only when the stream reports a rewindable window (HLS, at least
  30 seconds). Progressive streams and short windows show neither; the controls are **hidden, not
  disabled** (R22).

The remote cross-device view keeps its `RemoteLiveLabel` (area B/section 7); nothing here changes
it. Non-live playback is unchanged.

## Building blocks

- Plan 51: `useLiveMediaSnapshot()` (`apps/web/src/hooks/useLiveMediaSnapshot.ts`) returns
  `{ attached, display }`, where `display` is plan 11's `LivePlaybackDisplay`
  (`isAtLiveEdge`, `behindLiveSeconds`, `behindLiveLabel`, `canRewind`, `windowFraction`).
  `liveMediaStore` (`apps/web/src/lib/livePlayback/liveMediaStore.ts`) has `goToLive()`,
  `seekTo(seconds)`, `seekToFraction(fraction)`, `jumpBy(delta)`, `getSnapshot()`.
- Liveness of the local resource: `isPlayerResourceLive({ mpItem, mpAddByRSS })` from
  `apps/web/src/lib/crossDevicePlayback/playbackResource.ts`, values from `useMediaPlayer()`.
- Parity source for the scrubber: `RemoteMediaPlayerProgress.tsx` (mouse drag, window listeners,
  cleanup) and the bar markup in `LocalMediaPlayerProgress` (`customProgressBar`,
  `customProgressBarInner`, `progressLevel`, `progressRemaining`).

## Change 1 — i18n keys (consumer layer, all four locales)

In `packages/i18n-catalog/consumer/originals/*.json`, inside `media_player`, after
`position_of_duration`:

| Key | en-US | es | fr | el-GR |
| --- | --- | --- | --- | --- |
| `go_to_live` | `Go to Live` | `Ir al directo` | `Revenir au direct` | `Μετάβαση στο ζωντανό` |
| `behind_live` | `{time} Behind Live` | `{time} por detrás del directo` | `{time} de retard sur le direct` | `{time} πίσω από το ζωντανό` |

`go_to_live` is the Live control's accessible name (its visible text stays `media.livestream.live`;
the visible word is inside the name). `behind_live` is the screen-reader text for the behind-live
time. Area G (mobile player) reuses both keys. Do not edit `overrides/`.

## Change 2 — `Sliders/LiveMediaPlayerProgress.tsx` (new)

```typescript
type LiveMediaPlayerProgressProps = {
  includeMobileTime?: boolean;
  layoutVariant: 'default' | 'edge';
};
export const LiveMediaPlayerProgress: React.FC<LiveMediaPlayerProgressProps>;
```

Reads `useLiveMediaSnapshot().display`, `usePlayerTransport().goToLive` (Change 5),
`useTranslations('media')`, `useTranslations('media_player')`. Styles from
`MediaPlayerProgress.module.scss` (Change 3). `formatHHMMSS` from `@podverse/helpers`.

Pieces (local to the file):

- **Live control** — `<button type="button">` with visible text `tMedia('livestream.live')`,
  `aria-label={tMediaPlayer('go_to_live')}`, `onClick={goToLive}`,
  `data-testid="media-player-live-control"`,
  `data-at-live-edge={display.isAtLiveEdge ? 'true' : 'false'}`, class `liveControl` plus
  `liveControlAtEdge` when at the edge.
- **Behind time** — when `display.behindLiveLabel !== null`: a visible
  `<span aria-hidden="true" data-testid="media-player-live-behind">{display.behindLiveLabel}</span>`
  and a `<span className={styles.visuallyHidden}>{tMediaPlayer('behind_live', { time:
  formatHHMMSS(display.behindLiveSeconds) })}</span>`. At the edge the slot renders empty.
- **Scrubber** — only when `display.canRewind`. A `div` with `role="slider"`,
  `aria-label={tMediaPlayer('seek')}`, `aria-valuemin={0}`, `aria-valuemax={100}`,
  `aria-valuenow={Math.round(shownFraction * 100)}`, `aria-valuetext` = the `behind_live` string
  when behind, else `tMedia('livestream.live')`, `tabIndex={0}`,
  `data-testid="media-player-live-scrubber"`. Inner bar uses the same
  `customProgressBarInner` / `progressLevel` / `progressRemaining` markup as the local bar;
  `shownFraction = dragFraction ?? display.windowFraction ?? 1`. No chapter markers, highlight, or
  tooltip.
  - Mouse: copy `RemoteMediaPlayerProgress`'s `handleMouseDown` structure (fraction from
    `clientX` relative to `barRef`, window `mousemove` / `mouseup`, a `removeWindowListenersRef`
    cleaned up on unmount), but compute a fraction 0..1 instead of seconds and call
    `liveMediaStore.seekToFraction(released)` on mouseup. A plain click is a mousedown plus
    mouseup, so it seeks too.
  - Touch: `onTouchEnd` with the last touch's `clientX` → `liveMediaStore.seekToFraction`.
  - Keyboard: no slider-local key handler; ArrowLeft / ArrowRight go through the window handler
    (Change 6), which skips by 10 seconds when the window is rewindable.

Layouts:

- `layoutVariant === 'default'`, `canRewind`:
  `<div className={styles.mediaPlayerProgress}>` with
  `<span className={styles.mediaPlayerProgressTime}>{behind time}</span>`, the scrubber, and
  `<span className={styles.mediaPlayerProgressDuration}>{Live control}</span>`. When
  `includeMobileTime`, add the `mobileTimeWrapper` row after them, with the behind time in
  `mediaPlayerProgressTimeMobile` and a second Live control in `mediaPlayerProgressDurationMobile`
  (the existing CSS shows one set per breakpoint; hidden copies leave the accessibility tree
  because they are `display: none`).
- `layoutVariant === 'default'`, not `canRewind`:
  `<div className={classNames(styles.mediaPlayerProgress, styles.liveOnly)}>` holding only the Live
  control, centered. No time slot: without a window the player is always at live.
- `layoutVariant === 'edge'`, `canRewind`: `.mediaPlayerProgress.mediaPlayerProgressEdge` holding
  only the scrubber (the narrow bar shows no clocks, as for non-live).
- `layoutVariant === 'edge'`, not `canRewind`:
  `<div className={styles.liveEdgeLabel} data-testid="media-player-live-edge-label"><span>{tMedia('livestream.live')}</span></div>`.
  Non-interactive: the narrow bar's top edge is too small a target; the full-screen player has the
  Live control. `MediaPlayerControlsMobile` positions it (Change 4).

## Change 3 — styles (`MediaPlayerProgress.module.scss`)

Add, using existing tokens only (no `var()` fallbacks):

- `.liveControl`: reset button chrome (no border or background, `padding: 0`, `cursor: pointer`,
  inherit font family), `font-size: var(--font-size-sm)`, `font-weight: var(--font-weight-bold)`,
  `text-transform: uppercase`, `color: var(--text-color-tertiary)`. Visible `:focus-visible`
  outline matching other player buttons.
- `.liveControlAtEdge`: `color: var(--text-color-danger)` (the same red as `RemoteLiveLabel`).
- `.liveOnly`: `justify-content: center`, `min-height: 24px` (matches `.remoteLiveLabel`).
- `.liveEdgeLabel`: the `.remoteLiveLabel` + `.text` rules from
  `styles/components/MediaPlayer/CrossDevice/RemoteLiveLabel.module.scss`, applied to the
  container and its `span`.
- `.visuallyHidden`: the same block as
  `styles/components/MediaPlayer/SegmentStrip/MediaPlayerSegmentStrip.module.scss` `.visuallyHidden`.

## Change 4 — wire the live branch in

- `Sliders/MediaPlayerProgress.tsx`, `MediaPlayerProgress` wrapper: after the remote branch, read
  `const { mpItem, mpAddByRSS } = useMediaPlayer();` (call it before the remote `if` so hook order
  is fixed). When `!props.isClipForm && props.layoutVariant !== 'embed' &&
  isPlayerResourceLive({ mpItem, mpAddByRSS })`, return
  `<LiveMediaPlayerProgress includeMobileTime={props.includeMobileTime} layoutVariant={props.layoutVariant === 'edge' ? 'edge' : 'default'} />`.
  Otherwise `LocalMediaPlayerProgress` as today.
- `LocalMediaPlayerProgress` (default variant clocks): add `data-testid="media-player-current-time"`
  to the `mediaPlayerProgressTime` span and `data-testid="media-player-duration"` to the
  `mediaPlayerProgressDuration` span. No other change to the non-live bar.
- `Mobile/MediaPlayerControlsMobile.tsx`: for a local live resource that cannot rewind
  (`isPlayerResourceLive(...)` and `!useLiveMediaSnapshot().display.canRewind`), render
  `<div className={styles.liveEdge}><MediaPlayerProgress layoutVariant="edge" /></div>` so the
  label sits where the remote Live label sits. Every other case is unchanged.

## Change 5 — transport (`hooks/usePlayerTransport.ts`)

- Add `goToLive: () => void` to `PlayerTransport`: `drop` or `remote` → return (the remote view
  has no Live control); local and not live → return; local live →
  `liveMediaStore.goToLive(); setMPIsPlaying(true);`. Pressing Live always plays (plan 11).
- `seekTo`, local branch: when `isPlayerResourceLive({ mpItem, mpAddByRSS })`, call
  `liveMediaStore.seekTo(seconds)` and return (no `setMPCurrentTime`).
- `jumpBy`, local branch: when live, call `liveMediaStore.jumpBy(deltaSeconds)` and return. The
  store does nothing on a window that cannot rewind.
- Add `mpItem` and `mpAddByRSS` to the affected `useCallback` deps. Update any typed
  `PlayerTransport` test doubles (search `apps/web/src` for `PlayerTransport` and
  `usePlayerTransport` mocks) to include `goToLive: vi.fn()`.

## Change 6 — skip buttons and keys follow the window

- New `apps/web/src/hooks/useShowJumpButtons.ts`:

  ```typescript
  /** Skip buttons show for non-live media, a remote that can skip, or a rewindable live window. */
  export function useShowJumpButtons(): boolean {
    const remote = useRemotePlayerDisplay();
    const { mpItem, mpAddByRSS } = useMediaPlayer();
    const live = useLiveMediaSnapshot();
    if (remote !== null) {
      return remote.controls.canSkip;
    }
    if (!isPlayerResourceLive({ mpItem, mpAddByRSS })) {
      return true;
    }
    return live.display.canRewind;
  }
  ```

- Replace `const showJumpButtons = remote === null || remote.controls.canSkip;` with
  `const showJumpButtons = useShowJumpButtons();` in `Desktop/MediaPlayerControlsDesktop.tsx`,
  `Modal/MediaPlayerControlsModal.tsx`, and `Mobile/MediaPlayerButtonsMobile.tsx`. Keep `remote`
  where those files still use it for other controls.
- `Controller/mediaPlayerWindowKeyDown.ts`: rename `MediaPlayerKeyDownState.isLiveItem` to
  `canJump: boolean` and invert the two guards (`if (!state.canJump) return;`).
- `Controller/MediaPlayerController.tsx`: pass
  `canJump: !current.isLive || (!current.isRemote && liveMediaStore.getSnapshot().display.canRewind)`,
  read inside the keydown handler so it is current at the moment of the key press.

## Change 7 — decision matrix (`MEDIA-PLAYER-DECISION-MATRIX.md`)

- § 6 intro: one sentence after the paragraph about `MediaPlayerController` mounts: "Live position
  lives in `liveMediaStore` (`lib/livePlayback/liveMediaStore.ts`). The live element a host
  mounts registers there; Add by RSS livestreams register the non-live element."
- § 6a table: add these rows after "Live stream end / disconnect". Do not edit the
  "Reload while live is playing" row (area D owns it).
  - **Live time and duration** — "`mpDuration` is 0 for every live resource, set on load. The
    duration slot is the Live control; the time slot is empty at the live edge and shows `−m:ss`
    when more than 10 s behind (`resolveLivePlaybackDisplay`)."
  - **Rewind window** — "`readLiveSeekWindow` reads the last `seekable` range for HLS only; the live
    edge is hls.js `liveSyncPosition`, or for native HLS the range end minus the offset measured at
    first play. A window of 30 s or more shows the scrubber and skip buttons; progressive streams
    and shorter windows hide them."
  - **Play after pause** — "`liveMediaStore.prepareResume` runs before `play()`: an element that
    has not played starts as is; HLS resumes in place while the paused moment is 6 s or more inside
    the window, otherwise seeks to the live edge; progressive reconnects (new element, or
    `reloadAt(0)` for Add by RSS)."
  - **Live control** — "`transport.goToLive` seeks to the live edge, or reconnects when there is no
    window, then sets `mpIsPlaying`."
- § 6b: add a bullet: "`media-player-livestream-live-controls.spec.ts` — Live control in place of
  the duration after an episode, progressive reconnect, HLS rewind / resume in place / go to live,
  and no rewind controls on a short window."
- § 6c "What a progressive file does and does not cover": replace "Safari native HLS, real
  live-edge advance, `duration === Infinity`, and cross-source fallback are still not asserted."
  with "Rewind, resume in place, and go to live are asserted on a static EVENT playlist in Chromium
  through `hls.js`. Safari native HLS (including the join-offset live edge), real live-edge
  advance, `duration === Infinity`, and cross-source fallback are still not asserted." (Plan 53
  adds the § 6c table row for the rewind fixture.)

After editing, run
`npx prettier --write apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md` so the
tables stay aligned (formatting only, not a test).

## Change 8 — E2E spec `apps/web/e2e/media-player-livestream-live-controls.spec.ts` (new)

Follow `media-player-podcast-to-livestream-transition.spec.ts` (API login, queue clear, helpers)
and `media-player-livestream-hls-start.spec.ts` (`captureVerifiedElement`, page-error capture).
Complete-sentence test and step names (**e2e-readability**). Scope every player query to
`aside#media-player`; query buttons with `getByRole` (hidden breakpoint copies are excluded) and
testids with a `:visible` CSS suffix.

Constants from `./helpers/seedConstants`: `E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT`,
`E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT` / `_TITLE`, `E2E_LIVE_AV_HLS_AUDIO_ITEM_ID_TEXT` / `_TITLE`, and
plan 53's `E2E_LIVE_AV_HLS_REWIND_ITEM_ID_TEXT` / `_TITLE`. Behind-label pattern:
`/^\u2212\d+:\d{2}$/`.

1. **"Starting a progressive livestream after an episode shows Live in place of the episode's
   duration, hides rewind controls, and reconnects when Live is pressed after a pause"**
   - Play `E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT` (title `E2E Podcast No Stored Position`);
     `[data-testid="media-player-duration"]:visible` matches `/^\d+:\d{2}$/`.
   - `openLivestreamAndPlay` the progressive live audio item. The `Go to Live` button is visible
     with text `Live`; `media-player-duration:visible`, `media-player-live-behind:visible`,
     `media-player-live-scrubber:visible` each have count 0; no button named `/^Jump Back/` or
     `/^Jump Forward/` in the aside.
   - Mark the live `<audio>` (`liveStreamMediaElement`) with
     `el.setAttribute('data-e2e-connection', 'first')`. Pause from the player
     (`persistentPlayerPlayingButtons(page).first().click()`, then
     `expectPersistentPlayerPlaying(page, false)`). Press `Go to Live`.
     `expectPersistentPlayerPlaying(page, true)`; `[data-e2e-connection="first"]` count 0;
     `liveStreamMediaElement` count 1 with a `src`; `expectSingleSourcedMediaElement`.
2. **"A long HLS live window can be rewound with the scrubber, resumes where it was paused, and
   returns to the live moment when Live is pressed"** — `test.setTimeout(30_000)` with a one-line
   comment (hls.js loads lazily and the EVENT playlist must load before the window exists).
   - `openLivestreamAndPlay` the rewind item. Wait for `media-player-live-scrubber:visible` and a
     visible `Jump Back` button. No behind label.
   - Pause. Click the scrubber at 10% of its width
     (`click({ position: { x: box.width * 0.1, y: box.height / 2 } })`). The behind label is
     visible and matches the pattern.
   - Press Play in the aside. `expectPersistentPlayerPlaying(page, true)`; the behind label is
     still visible (resumed in place, not jumped to live).
   - Press `Go to Live`. The behind label has count 0, the control has
     `data-at-live-edge="true"`, and playback is still on. `captureVerifiedElement` on the Live
     control.
3. **"A short HLS live window shows Live without a scrubber or skip buttons"** — same timeout
   comment. `openLivestreamAndPlay` `E2E_LIVE_AV_HLS_AUDIO_ITEM_ID_TEXT`; poll the live audio's
   `currentTime` above 0; `Go to Live` visible; scrubber count 0; no `Jump Back` button.

Each test collects `pageerror` and asserts none at the end. Keep every other wait at the default
timeout (**e2e timeout budget**).

## Tests

- New `apps/web/src/components/MediaPlayer/Sliders/LiveMediaPlayerProgress.test.tsx` (Vitest +
  Testing Library; mock `next-intl` as `src/components/embed/__tests__/EmbedListRow.test.tsx`
  does, and mock `useLiveMediaSnapshot` and `usePlayerTransport`):
  - At the edge without a window: one Live control named `Go to Live`, no scrubber, no behind
    text.
  - Behind on a rewindable window: the behind label `−1:05` is visible, the screen-reader text is
    present, the scrubber shows, its `aria-valuenow` follows `windowFraction`.
  - Clicking the Live control calls `goToLive`.
  - Edge variant without a window renders the static label, not a button.
- `mediaPlayerWindowKeyDown.test.ts`: arrows skip when `canJump` is true and do nothing when it is
  false (replaces the `isLiveItem` cases).
- E2E: `apps/web/e2e/media-player-livestream-live-controls.spec.ts` (Change 8). The existing
  livestream specs in § 6b run unchanged.
- `npm run i18n:validate` covers the four catalogs.

## Release scratchpad

```markdown
## Livestreams show Live, behind-live time, and rewind only when the stream allows it

- Surfaces: web, i18n (consumer catalog: `media_player.go_to_live`, `media_player.behind_live`)
- Change: While a livestream plays, the player's duration slot is a Live control instead of a
  number. Pressing it jumps to the current live moment and plays. The time on the left is empty at
  the live moment and shows how far behind live you are (for example −0:42) after rewinding. The
  scrubber and the skip-back / skip-forward buttons (and the arrow keys) only appear for streams
  that report a rewindable window of at least 30 seconds (HLS); plain progressive streams are
  live-only and show just the Live control. Screen readers hear "Go to Live" and "0:42 Behind
  Live".
- Who notices: every web listener of a livestream
- Operator steps: none
```
