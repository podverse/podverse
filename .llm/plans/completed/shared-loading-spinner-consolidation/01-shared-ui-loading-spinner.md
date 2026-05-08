# 01 - Add Shared LoadingSpinner And LoadingSpinnerOverlay

## Assessment

There are currently three loading indicators that should converge to one:

- App-local web spinner with i18n `aria-label`:
  [apps/web/src/components/LoadingSpinner/LoadingSpinner.tsx](../../../../apps/web/src/components/LoadingSpinner/LoadingSpinner.tsx)
  +
  [apps/web/src/styles/components/LoadingSpinner/LoadingSpinner.module.scss](../../../../apps/web/src/styles/components/LoadingSpinner/LoadingSpinner.module.scss).
  Sizes: `small=18`, `medium=32`, `large=48`. Uses `react-icons/fa6` `FaSpinner`.
- App-local web overlay:
  [apps/web/src/components/LoadingSpinner/LoadingSpinnerOverlay.tsx](../../../../apps/web/src/components/LoadingSpinner/LoadingSpinnerOverlay.tsx)
  +
  [apps/web/src/styles/components/LoadingSpinner/LoadingSpinnerOverlay.module.scss](../../../../apps/web/src/styles/components/LoadingSpinner/LoadingSpinnerOverlay.module.scss).
  Props: `size`, `className`, `style`, `isLoading`, `message`. Uses
  `--sidebar-desktop-width` to offset against the web sidebar.
- Tiny inline-with-text spinner:
  [packages/ui/src/components/layout/InlineSpinner/InlineSpinner.tsx](../../../../packages/ui/src/components/layout/InlineSpinner/InlineSpinner.tsx)
  (uses `react-icons/fa` `FaSpinner`, `aria-hidden`, font-size sized).

`packages/ui` already depends on `react-icons` and `classnames`, so no new deps are
needed. Per the [shared-ui-i18n](../../../../.cursor/rules/shared-ui-i18n.mdc) rule, the
shared component must take user-facing strings as props (no `next-intl` import).

## Prompt

Create the shared loading components in `@podverse/ui`. Do not migrate callsites yet, and
do not remove the existing app-local components or the `LoadingText` / `InlineSpinner`
exports in this prompt — those happen in `02` and `03`.

1. Add `packages/ui/src/components/layout/LoadingSpinner/`:
   - `LoadingSpinner.tsx` with these props:
     - `size?: 'inline' | 'small' | 'medium' | 'large'` (default `medium`).
     - `ariaLabel?: string` — required when the spinner is the only thing announcing the
       loading state. When `decorative` is true (or `size === 'inline'` and no
       `ariaLabel` is provided), render `aria-hidden="true"` instead.
     - `decorative?: boolean` — opt-in `aria-hidden` for cases where adjacent text
       already announces the state (e.g. `<LoadingSpinner size="inline" decorative /> Counting…`).
     - `className?: string`, `style?: React.CSSProperties`.
   - Render `FaSpinner` from `react-icons/fa6`. For `inline`, render at the surrounding
     font-size (no fixed pixel size); for `small | medium | large` use the existing
     pixel mapping (`18 / 32 / 48`).
   - `LoadingSpinner.module.scss` with the spin keyframe and per-size styles. Port the
     inline behavior from the existing
     [InlineSpinner.module.scss](../../../../packages/ui/src/components/layout/InlineSpinner/InlineSpinner.module.scss)
     (`display: inline-flex`, `vertical-align: middle`, `font-size: var(--font-size-base)`,
     `color: var(--text-color-secondary)`).
   - `LoadingSpinner.test.tsx` covering: default size, each size variant, `ariaLabel`
     applied, `decorative` / inline default to `aria-hidden`, `className` merging.
   - `index.ts` barrel.
2. Add `packages/ui/src/components/layout/LoadingSpinnerOverlay/`:
   - `LoadingSpinnerOverlay.tsx` ported from
     [apps/web/src/components/LoadingSpinner/LoadingSpinnerOverlay.tsx](../../../../apps/web/src/components/LoadingSpinner/LoadingSpinnerOverlay.tsx).
     Props: `isLoading?: boolean`, `message?: string`, `size?: 'small' | 'medium' | 'large'`
     (default `large`), `className?`, `style?`, plus required `ariaLabel: string` passed
     through to the inner `LoadingSpinner`.
   - `LoadingSpinnerOverlay.module.scss` ported from the web file. Keep the
     `--sidebar-desktop-width` reference; document in a top-of-file comment that the
     consumer app must define this CSS variable (web already does).
   - `LoadingSpinnerOverlay.test.tsx`: returns `null` when `isLoading` is false, renders
     `message` when provided, passes `ariaLabel` to the spinner.
   - `index.ts` barrel.
3. Update [packages/ui/src/index.ts](../../../../packages/ui/src/index.ts):
   - Add named exports + types for `LoadingSpinner`, `LoadingSpinnerProps`,
     `LoadingSpinnerSize`, `LoadingSpinnerOverlay`, `LoadingSpinnerOverlayProps`.
   - **Do not** remove `LoadingText` or `InlineSpinner` exports in this prompt.

## Acceptance Criteria

- Shared `LoadingSpinner` and `LoadingSpinnerOverlay` exist under `packages/ui` with
  matching SCSS modules and unit tests.
- Both are exported from the `@podverse/ui` barrel.
- Inline (`size="inline"`) usage matches the current `InlineSpinner` visuals.
- No callsite changes yet; existing `LoadingText`, `InlineSpinner`, and the app-local
  web components remain untouched.

## Verification

```bash
./scripts/nix/with-env npm run lint -w @podverse/ui
./scripts/nix/with-env npm run type-check -w @podverse/ui
./scripts/nix/with-env npm run test -w @podverse/ui
```
