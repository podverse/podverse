# Floating video — resizable (corner drag)

## Scope

- Extend the floating video transform hook so the user can **drag the top-left corner** to
  grow or shrink the player while **preserving aspect ratio**.
- Applies to both non-live and livestream floating portals.
- Size is **in-memory only** — reload restores plan 01 default dimensions.
- **Disabled on touch/coarse pointers** to avoid accidental resize during page scroll.

## Prerequisites

- Plan 01 complete (default size: non-live `width: 400px`; livestream `width: 400px`,
  `height: 225px`).
- Plan 02 complete (`useFloatingVideoTransform` exists with drag).

## Why this step exists

- User wants corner-based resize without a third-party library.
- Top-left handle is the free corner when the player is anchored bottom-right (plan 01
  default).

## Design

### Extend `useFloatingVideoTransform`

File:
[`apps/web/src/hooks/useFloatingVideoTransform.ts`](/apps/web/src/hooks/useFloatingVideoTransform.ts)

**Additional state:**

```typescript
type FloatingVideoSize = { width: number; height: number };

// size === null → use SCSS default width/height
// size !== null → apply inline width/height on container
```

**Additional return values:**

```typescript
{
  resizeHandleProps: {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  };
  isResizing: boolean;
  resizeEnabled: boolean; // false when coarse pointer / touch-primary
}
```

Merge `width`/`height` into `containerStyle` when `size !== null`.

**Aspect ratio source:**

- Read from the inner `<video>` element's `videoWidth` / `videoHeight` when available
  (`readyState >= 1` and both > 0).
- Fallback: container's current `getBoundingClientRect()` ratio, else `16 / 9`.
- For livestream (video.js): query the `.video-js` or underlying `<video>` inside the portal
  children via a callback ref or `containerRef.current.querySelector('video')`.

**Resize algorithm (anchor bottom-right):**

The portal's bottom-right corner stays fixed while the top-left moves.

1. On resize `pointerdown` (top-left handle only):
   - `event.stopPropagation()` so drag does not start.
   - Ignore `event.pointerType === 'touch'`.
   - Ignore when `resizeEnabled === false`.
   - Capture pointer on the handle element.
   - Record `anchorRight = rect.right`, `anchorBottom = rect.bottom`, starting size.
2. On `pointermove`:
   - `newWidth = anchorRight - event.clientX` (clamped).
   - `newHeight = newWidth / aspectRatio` (preserve scale).
   - Recompute `left = anchorRight - newWidth`, `top = anchorBottom - newHeight`.
   - Clamp:
     - `MIN_WIDTH = 200`, `MAX_WIDTH = min(800, window.innerWidth)`.
     - Ensure `top >= 0`, `left >= 0`.
   - Set both `size` and `position` (resize implies explicit coordinates).
3. On `pointerup`: release capture, `isResizing = false`.

### Resize handle UI

In both portal TSX files, render a handle **only when `resizeEnabled`**:

```tsx
{resizeEnabled && (
  <div
    className={cssClass(styles, 'resizeHandle')}
    data-floating-video-ignore-drag
    data-testid="floating-video-resize-handle"
    {...resizeHandleProps}
    aria-hidden="true"
  />
)}
```

### SCSS for resize handle

Add to both portal SCSS modules:

```scss
.resizeHandle {
  position: absolute;
  top: 0;
  left: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  z-index: 3;
}

@media (pointer: coarse) {
  .resizeHandle {
    display: none;
  }
}
```

Optional subtle visual: semi-transparent corner indicator on `:hover` of the portal (desktop
only) — keep minimal to match existing close-button-on-hover pattern.

### Touch / coarse pointer guard

- Hide handle via `@media (pointer: coarse)` (SCSS above).
- In the hook, set `resizeEnabled` from
  `window.matchMedia('(pointer: fine)').matches` on mount (and optionally on
  `matchMedia` change). Default `resizeEnabled` to `false` during SSR/hydration, then
  update in `useEffect`.
- Ignore resize `pointerdown` when `event.pointerType === 'touch'`.

Drag (plan 02) is also disabled on touch/coarse pointers — both transform gestures are
desktop-only.

### Unit tests

Extend or add
[`apps/web/src/hooks/__tests__/useFloatingVideoTransform.resize.test.tsx`](/apps/web/src/hooks/__tests__/useFloatingVideoTransform.resize.test.tsx):

- Resize pointer sequence increases `size.width` and updates `position.top`/`left`.
- Aspect ratio preserved (height = width / ratio).
- `resizeEnabled: false` ignores resize pointerdown.
- Min/max width clamping.

### E2E spec

Create [`apps/web/e2e/media-player-floating-video-resize.spec.ts`](/apps/web/e2e/media-player-floating-video-resize.spec.ts):

- Desktop viewport only (`min-width: breakpoints.$breakpoint-lg-min`).
- Play video item, locate resize handle `[data-testid="floating-video-resize-handle"]`.
- Drag handle up-left ~100px.
- Assert portal `width` increased (compare `getBoundingClientRect().width` before/after).
- Assert aspect ratio approximately stable (allow ±2px rounding).
- Reload page → assert default `width` restored (~400px).

**Mobile viewport test:** set narrow viewport, assert resize handle is not visible (or count
=== 0). Do not attempt corner drag on mobile.

## Key files

| File                                                                                                                                    | Change                |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| [`useFloatingVideoTransform.ts`](/apps/web/src/hooks/useFloatingVideoTransform.ts)                                                      | Add size + resize     |
| [`MediaPlayerVideoPortalFloating.tsx`](/apps/web/src/components/MediaPlayer/Controller/Video/MediaPlayerVideoPortalFloating.tsx)        | Resize handle         |
| [`MediaPlayerLivestreamVideoPortalFloating.tsx`](/apps/web/src/components/MediaPlayer/Controller/LiveStream/MediaPlayerLivestreamVideoPortalFloating.tsx) | Resize handle         |
| Both portal `.module.scss` files                                                                                                        | `.resizeHandle`       |
| [`useFloatingVideoTransform.resize.test.tsx`](/apps/web/src/hooks/__tests__/useFloatingVideoTransform.resize.test.tsx)                  | Unit tests            |
| [`media-player-floating-video-resize.spec.ts`](/apps/web/e2e/media-player-floating-video-resize.spec.ts)                                | E2E                   |

## Interaction with drag (plan 02)

- Resize handle has `data-floating-video-ignore-drag` — dragging the handle must not start
  a move drag.
- Body drag still works when not hitting the handle or close button.
- If user resizes then drags, both `size` and `position` persist in memory until reload.

## Out of scope

- Persisting size across reloads.
- Modal video (plan 04).
- Livestream video in modal.

## Expected outcome

- Desktop: top-left corner resizes both floating players with preserved aspect ratio.
- Mobile/touch: no resize handle, no drag (plan 02); no accidental move or resize during
  scroll/swipe.
- Reload resets to default 400px width (and 225px height for livestream).

## Operator verification

```bash
npm run lint
npm run test:unit
make e2e_test_web_report_spec SPEC=e2e/media-player-floating-video-resize.spec.ts
```

Open `.artifacts/e2e-reports/latest/web/index.html` and confirm resize + reload-reset
screenshots.

Manual check: resize livestream floating player on desktop if local live video is
available.
