# Space shortcut — focus main wrapper on benign click

## Scope

- Make `#mainOuterWrapper` programmatically focusable.
- On benign `mousedown` in main content, focus the wrapper so a subsequent Space keydown
  sees a non-blocked target.
- Hide mouse-focus ring; preserve keyboard `:focus-visible` styling.
- E2E: click empty main area → Space toggles play; sidebar link focus → Space does not
  toggle play.

Out of scope: changing `button` / `a[href]` exclusion logic in `mediaPlayerWindowKeyDown.ts`.

## Why this step exists

Clicking empty page space does **not** move keyboard focus. Focus stays on the last
interactive element (sidebar link, nav filter, tile link, player button). The Space handler
uses `e.target` (the focused element) and returns early for links and buttons.

User repro: `/podcasts` with loaded paused podcast → click empty black area → Space does
nothing.

## Design

Implement in **web `MainWrapper.tsx`** first (not `packages/ui`) to limit blast radius.
management-web does not use `MainPageScaffold`.

### Interactive selector (skip focus steal)

Do **not** focus the wrapper when `mousedown` target is inside:

```text
button, a, input, textarea, select, [contenteditable], [contenteditable="true"],
[role="button"], [role="slider"], [role="menuitem"], [role="menu"], [role="menubar"],
[role="listbox"], [role="option"], [role="dialog"]
```

Use `Element.closest()` on the event target.

### Focus target

The outer scroll container `#mainOuterWrapper` from `MainPageScaffold` — add `tabIndex={-1}`
and a ref on the scaffold outer div.

**Option A (preferred):** Extend [`MainPageScaffold`](/packages/ui/src/components/layout/MainPageScaffold/MainPageScaffold.tsx)
with optional props:

- `outerTabIndex?: number` (pass `-1` from web)
- `outerRef?: RefObject<HTMLDivElement | null>` or callback ref
- `onOuterMouseDown?: (event: MouseEvent<HTMLDivElement>) => void`

Keep defaults unchanged so other consumers are unaffected.

**Option B:** Wrap `MainPageScaffold` in a web-only div with `id="mainOuterWrapper"` duplicate
— **avoid** (breaks scroll id contract in
[`scroll.ts`](/apps/web/src/utils/scroll.ts) and Boost messages).

Use Option A.

## Steps

### 1. Extend MainPageScaffold (packages/ui)

File: [`MainPageScaffold.tsx`](/packages/ui/src/components/layout/MainPageScaffold/MainPageScaffold.tsx)

- Add optional props to `MainPageScaffoldProps`:
  - `outerTabIndex?: number`
  - `onOuterMouseDown?: (event: React.MouseEvent<HTMLDivElement>) => void`
- Apply to outer `#mainOuterWrapper` div.
- Update [`MainPageScaffold.test.tsx`](/packages/ui/src/components/layout/MainPageScaffold/MainPageScaffold.test.tsx) if needed (outerTabIndex forwarded).

### 2. Focus styling

File: new or existing web SCSS adjacent to MainWrapper, e.g.
[`MainWrapper.module.scss`](/apps/web/src/styles/components/Main/MainWrapper.module.scss)
(if created) or a class on the outer element via `className` prop on `MainPageScaffold`.

```scss
.mainOuterWrapperFocusTarget:focus:not(:focus-visible) {
  outline: none;
}
```

Pass `className` to merge with scaffold outer class if supported; otherwise add optional
`outerClassName` prop to `MainPageScaffold`.

### 3. Wire MainWrapper

File: [`MainWrapper.tsx`](/apps/web/src/components/Main/MainWrapper.tsx)

- `useRef<HTMLDivElement>(null)` for outer wrapper.
- `handleOuterMouseDown`:
  - If `(event.target as Element).closest(INTERACTIVE_SELECTOR)` — return.
  - Else `outerRef.current?.focus({ preventScroll: true })`.
- Pass `outerTabIndex={-1}`, `onOuterMouseDown={handleOuterMouseDown}`, ref/class to
  `MainPageScaffold`.

Extract `INTERACTIVE_SELECTOR` as a module-level constant string in MainWrapper (or shared
util if reused in plan 03).

### 4. E2E tests

File: [`media-player-space-shortcut.spec.ts`](/apps/web/e2e/media-player-space-shortcut.spec.ts)

Add cases:

1. **Empty main click:** load podcast audio → click empty area inside `#mainOuterWrapper`
   (e.g. padding below grid, use coordinates or a test id on empty region) → Space toggles
   `[data-media-player-playing]`.
2. **Sidebar link regression:** focus sidebar podcasts link → Space → play state unchanged
   (and/or link navigation only if applicable).

Follow [`e2e-page-tests`](/.cursor/skills/e2e-page-tests/SKILL.md) and
[`e2e-screenshot-verified-element`](/.cursor/skills/e2e-screenshot-verified-element/SKILL.md)
patterns.

### 5. Unit test (optional)

If practical, test `handleOuterMouseDown` logic via extracted pure helper
`shouldFocusMainWrapperOnMouseDown(target: Element): boolean` in web utils — keeps guards
testable without DOM mount.

## Files touched (expected)

- `packages/ui/src/components/layout/MainPageScaffold/MainPageScaffold.tsx`
- `packages/ui/src/components/layout/MainPageScaffold/MainPageScaffold.test.tsx` (maybe)
- `apps/web/src/components/Main/MainWrapper.tsx`
- `apps/web/src/styles/components/Main/MainWrapper.module.scss` (if new)
- `apps/web/e2e/media-player-space-shortcut.spec.ts`

## Verification (operator)

```bash
npm run lint
npm run build:packages
npm run build -w apps/web
npm run test:unit
make e2e_test_web_report_spec SPEC=e2e/media-player-space-shortcut.spec.ts
```

Open `.artifacts/e2e-reports/latest/web/index.html`.

## Risks and mitigations

| Risk                         | Mitigation                                      |
| ---------------------------- | ----------------------------------------------- |
| Focus ring on scroll area    | `:focus:not(:focus-visible)`                    |
| Stealing focus from controls | Strict `closest()` guard on mousedown           |
| Pages without MainWrapper    | Accept partial coverage; most chrome pages use it |

Requires plan 01 complete so Space toggle actually changes play state.
