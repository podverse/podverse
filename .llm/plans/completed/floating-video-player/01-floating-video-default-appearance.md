# Floating video — default appearance

## Scope

- Update default CSS for **both** floating video portals so they are flush to the right edge
  of the window and flush to the top of the bottom media player bar, with **square corners**.
- Applies to non-live and livestream floating players.
- No drag, resize, or modal changes in this plan.

## Why this step exists

- Current SCSS offsets the player `10px` from the right and above the bar, and applies
  `border-radius: var(--border-radius)`.
- User wants the default load position to match the screenshot intent: right-aligned, sitting
  directly on the bar, square edges.

## Current state

Non-live portal SCSS
([`MediaPlayerVideoPortalFloating.module.scss`](/apps/web/src/styles/components/MediaPlayer/Controller/Video/MediaPlayerVideoPortalFloating.module.scss)):

```scss
.floatingVideoPortal {
  position: fixed;
  bottom: calc(var(--media-player-height) + 10px);
  right: 10px;
  width: 400px;
  border-radius: var(--border-radius);
  // ...
}
```

Livestream portal SCSS
([`MediaPlayerLiveStreamVideoPortalFloating.module.scss`](/apps/web/src/styles/components/MediaPlayer/Controller/LiveStream/MediaPlayerLiveStreamVideoPortalFloating.module.scss))
mirrors the same offsets and border-radius (also has fixed `height: 225px`).

Both files define `.floatingVideoPortal.hasMarquee` with a taller bottom offset, but **no
TSX applies `hasMarquee` today** — leave the class in place for a future marquee adjustment;
update its `bottom` to stay flush with the bar when marquee is wired.

## Steps

### 1. Edit non-live floating portal SCSS

File:
[`apps/web/src/styles/components/MediaPlayer/Controller/Video/MediaPlayerVideoPortalFloating.module.scss`](/apps/web/src/styles/components/MediaPlayer/Controller/Video/MediaPlayerVideoPortalFloating.module.scss)

- Add `@use '../../../variables/breakpoints';` at the top (same pattern as other media
  player SCSS).
- Change `.floatingVideoPortal`:
  - `right: 0` (flush to viewport right).
  - `bottom: var(--media-player-height-mobile)` as the default (mobile bar height).
  - Remove `border-radius` entirely (square corners).
  - Keep `overflow: hidden`, `position: fixed`, `width: 400px`, `z-index: 1000`.
- Add a desktop breakpoint:

```scss
@media (min-width: breakpoints.$breakpoint-lg-min) {
  .floatingVideoPortal {
    bottom: var(--media-player-height);
  }
}
```

- Update `.floatingVideoPortal.hasMarquee` to use the same flush bar offsets (no `+ 10px`):

```scss
.floatingVideoPortal.hasMarquee {
  bottom: calc(var(--media-player-height-mobile) + var(--media-player-height-top-section));
}

@media (min-width: breakpoints.$breakpoint-lg-min) {
  .floatingVideoPortal.hasMarquee {
    bottom: calc(var(--media-player-height) + var(--media-player-height-top-section));
  }
}
```

### 2. Edit livestream floating portal SCSS

File:
[`apps/web/src/styles/components/MediaPlayer/Controller/LiveStream/MediaPlayerLiveStreamVideoPortalFloating.module.scss`](/apps/web/src/styles/components/MediaPlayer/Controller/LiveStream/MediaPlayerLiveStreamVideoPortalFloating.module.scss)

- Apply the **same** `right: 0`, flush `bottom`, breakpoint, and `hasMarquee` changes as
  step 1.
- Remove `border-radius`.
- Keep `height: 225px` and `width: 400px` unchanged (resize comes in plan 03).

### 3. Do not change TSX in this plan

Portal components stay as-is. No new props or hooks.

### 4. Add E2E spec

Create [`apps/web/e2e/media-player-floating-video-default.spec.ts`](/apps/web/e2e/media-player-floating-video-default.spec.ts):

- Use existing media-player E2E patterns (`e2e-readability`, `stepScreenshots`).
- Play a **video podcast** item (add a deterministic video item + enclosure to
  [`tools/web/seed-e2e.mjs`](/tools/web/seed-e2e.mjs) if none exists; `mediaType: 'video'`,
  `medium_id` = Video).
- Assert the floating portal element is visible.
- Assert computed style:
  - `right` is `0px` (or equivalent flush).
  - `border-radius` is `0px` on the portal container.
  - `bottom` matches `var(--media-player-height)` on desktop viewport (use
    `page.setViewportSize` ≥ lg breakpoint).
- Capture a step screenshot of the flush default position.

If livestream video E2E seed is not yet available (see decision matrix § 6c), document
livestream manual verification in the test file comment; do not block plan 01 on livestream
E2E.

## Key files

| File                                                                                                                                    | Change                    |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| [`MediaPlayerVideoPortalFloating.module.scss`](/apps/web/src/styles/components/MediaPlayer/Controller/Video/MediaPlayerVideoPortalFloating.module.scss) | Flush position, no radius |
| [`MediaPlayerLiveStreamVideoPortalFloating.module.scss`](/apps/web/src/styles/components/MediaPlayer/Controller/LiveStream/MediaPlayerLiveStreamVideoPortalFloating.module.scss) | Same                      |
| [`media-player-floating-video-default.spec.ts`](/apps/web/e2e/media-player-floating-video-default.spec.ts)                              | New E2E                   |
| [`tools/web/seed-e2e.mjs`](/tools/web/seed-e2e.mjs)                                                                                     | Video fixture if missing  |

## Expected outcome

- On load, both floating video players sit flush against the right edge and directly on top
  of the bottom bar with square corners.
- No behavior change to playback, close button, or modal.

## Operator verification

```bash
npm run lint
make e2e_test_web_report_spec SPEC=e2e/media-player-floating-video-default.spec.ts
```

Open `.artifacts/e2e-reports/latest/web/index.html` and confirm the portal is flush
right, flush on the bar, and square.

Manual check (livestream): if E2E seed lacks a video live item, start a live video stream
locally and confirm the livestream portal matches the same flush/square defaults.
