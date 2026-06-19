# Floating video — draggable

## Scope

- Make both floating video portals **click-and-drag** to any on-screen position on
  **desktop / fine pointer** devices.
- **Disabled on touch and coarse pointers** so incidental swipes on small screens do not
  move the player (see Touch UX below).
- Position is **in-memory only** — full page reload restores the plan 01 default (flush
  bottom-right).
- No resize in this plan (plan 03 adds corner resize).
- No modal changes.

## Prerequisites

- Plan 01 complete (flush default anchor in SCSS).

## Why this step exists

- User wants to reposition the small video player during a session without persisting
  across reloads.
- Native pointer events avoid third-party drag libraries.

## Design

### Hook: `useFloatingVideoTransform`

Create [`apps/web/src/hooks/useFloatingVideoTransform.ts`](/apps/web/src/hooks/useFloatingVideoTransform.ts).

**State (plan 02 — position only; plan 03 extends with size):**

```typescript
type FloatingVideoPosition = { left: number; top: number };

// position === null → use SCSS default anchor (right/bottom flush)
// position !== null → apply inline left/top; set right/bottom to 'auto'
```

**Return value (plan 02):**

```typescript
{
  containerStyle: CSSProperties;      // merged with any existing inline style
  dragHandleProps: {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  };
  isDragging: boolean;
  dragEnabled: boolean; // false when coarse pointer / touch-primary
}
```

**Touch UX (required):**

Floating video sits above scrollable page content. On phones, a body-level drag handler
would fight vertical scroll and accidental swipes across the player would reposition it.
Mirror plan 03's resize guard:

- `dragEnabled` from `window.matchMedia('(pointer: fine)').matches` (default `false` until
  hydrated in `useEffect`; optional `change` listener).
- Ignore `pointerdown` when `event.pointerType === 'touch'` or `dragEnabled === false`.
- Only spread `dragHandleProps` on the portal root when `dragEnabled`.
- On coarse pointers the player stays flush-default (plan 01); users rely on the modal
  (plan 04) for a larger view on mobile.

**Drag algorithm (when `dragEnabled`):**

1. `onPointerDown` on the portal container:
   - Ignore if `event.target` is the close button or inside `[data-floating-video-ignore-drag]`
     (reserved for plan 03 resize handle).
   - Ignore `event.button !== 0` (non-primary button).
   - Ignore `event.pointerType === 'touch'`.
   - Call `event.preventDefault()` to avoid text selection.
   - Read `containerRef.getBoundingClientRect()`.
   - If `position === null`, seed `{ left: rect.left, top: rect.top }` from current rendered
     position (converts CSS anchor to explicit coordinates).
   - Store `pointerId`, `offsetX = event.clientX - rect.left`,
     `offsetY = event.clientY - rect.top`.
   - `event.currentTarget.setPointerCapture(event.pointerId)`.
   - Set `isDragging = true`.
2. `onPointerMove` (while captured):
   - `newLeft = event.clientX - offsetX`, `newTop = event.clientY - offsetY`.
   - Clamp to viewport: `left >= 0`, `top >= 0`,
     `left + width <= window.innerWidth`,
     `top + height <= window.innerHeight`.
   - Update `position`.
3. `onPointerUp` / `onPointerCancel`:
   - `releasePointerCapture`, clear drag refs, `isDragging = false`.

Attach move/up handlers on the same element that captured the pointer (the portal root div).

**No persistence:** do not write to `localStorage`, cookies, or URL params.

### Portal wiring

Update both portal components to use the hook:

1. [`MediaPlayerVideoPortalFloating.tsx`](/apps/web/src/components/MediaPlayer/Controller/Video/MediaPlayerVideoPortalFloating.tsx)
2. [`MediaPlayerLivestreamVideoPortalFloating.tsx`](/apps/web/src/components/MediaPlayer/Controller/LiveStream/MediaPlayerLivestreamVideoPortalFloating.tsx)

For each:

- Add a `ref` on the portal root `div`.
- Spread `dragHandleProps` on the root `div` **only when `dragEnabled`**.
- Merge `containerStyle` into the root `style` (livestream portal already passes a `style`
  prop for `display: none` — merge, do not replace).
- Add `data-testid="floating-video-portal"` on the non-live portal (livestream: same id or
  `floating-video-portal-livestream`).

### SCSS updates

In both portal SCSS modules, add:

```scss
.floatingVideoPortal {
  @media (pointer: fine) {
    cursor: grab;
  }
}

.floatingVideoPortal.isDragging {
  cursor: grabbing;
  touch-action: none; // only while actively dragging on fine pointer
  user-select: none;
}

@media (pointer: coarse) {
  .floatingVideoPortal {
    touch-action: auto; // do not block page scroll gestures on the overlay
  }
}
```

Apply `isDragging` class from the hook return value via `cssClass`. Do **not** set
`touch-action: none` on the portal by default — that would block scroll when the overlay
is touched on mobile.

**Close button:** add `data-floating-video-ignore-drag` attribute so dragging does not start
when clicking close.

### Unit test

Create [`apps/web/src/hooks/__tests__/useFloatingVideoTransform.drag.test.tsx`](/apps/web/src/hooks/__tests__/useFloatingVideoTransform.drag.test.tsx):

- Render a minimal wrapper using the hook + a div with known dimensions.
- Simulate `pointerdown` → `pointermove` → `pointerup`.
- Assert `position` updates and `containerStyle` includes `left`/`top` with
  `right: 'auto'`, `bottom: 'auto'`.
- Assert clamping at viewport edges.
- Assert close-button target does not start drag (if testing via data attribute on child).
- Assert `dragEnabled: false` ignores touch `pointerdown` and leaves `position` null.

Keep tests behavior-focused per **unit-test-design-no-overgranularity**.

### E2E spec

Create [`apps/web/e2e/media-player-floating-video-drag.spec.ts`](/apps/web/e2e/media-player-floating-video-drag.spec.ts):

**Desktop viewport (lg+):**

- Start video playback (same seed/fixture as plan 01).
- Locate `[data-testid="floating-video-portal"]`.
- Record initial `getBoundingClientRect()`.
- Use Playwright `page.mouse` or `locator.dragTo` to drag the portal ~200px left and ~100px
  up.
- Assert new position differs from initial (deterministic delta).
- Reload the page, replay the same item.
- Assert portal returns to flush default (`right` edge ~0, `bottom` aligned to bar).

**Mobile viewport (narrow, touch emulation if available):**

- Play the same video item; record portal `getBoundingClientRect()`.
- Perform a swipe/drag gesture across the portal (touch or mouse on narrow viewport).
- Assert position unchanged (still flush right, same `left`/`top` within tolerance).

Use `capturePageLoad` / `actionAndCapture` per **e2e-screenshot-verified-element**.

## Key files

| File                                                                                                                                    | Change                         |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| [`useFloatingVideoTransform.ts`](/apps/web/src/hooks/useFloatingVideoTransform.ts)                                                      | New hook (position only)       |
| [`MediaPlayerVideoPortalFloating.tsx`](/apps/web/src/components/MediaPlayer/Controller/Video/MediaPlayerVideoPortalFloating.tsx)        | Wire hook                      |
| [`MediaPlayerLivestreamVideoPortalFloating.tsx`](/apps/web/src/components/MediaPlayer/Controller/LiveStream/MediaPlayerLivestreamVideoPortalFloating.tsx) | Wire hook                      |
| Both portal `.module.scss` files                                                                                                        | `cursor`, `isDragging`         |
| [`useFloatingVideoTransform.drag.test.tsx`](/apps/web/src/hooks/__tests__/useFloatingVideoTransform.drag.test.tsx)                      | Unit tests                     |
| [`media-player-floating-video-drag.spec.ts`](/apps/web/e2e/media-player-floating-video-drag.spec.ts)                                    | E2E                            |

## Out of scope

- Corner resize (plan 03).
- Modal video (plan 04).
- Persisting position across reloads.

## Expected outcome

- Desktop: user can drag both floating players anywhere within the viewport during a
  session.
- Mobile / touch: player stays in plan 01 default position; swipes do not move it.
- Reload resets to plan 01 default position.
- Close button still works; drag does not fire when clicking close.

## Operator verification

```bash
npm run lint
npm run test:unit
make e2e_test_web_report_spec SPEC=e2e/media-player-floating-video-drag.spec.ts
```

Open `.artifacts/e2e-reports/latest/web/index.html` and confirm drag + post-reload reset
screenshots.

Manual check: drag livestream floating player if local live video feed is available.
