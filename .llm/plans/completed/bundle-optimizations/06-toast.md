# Plan 06: Lazy-load or Replace react-hot-toast (Medium Priority)

## Goal

Reduce client bundle by **~142 KB parsed** (react-hot-toast) — either by lazy-loading the Toast/Toaster or by replacing it with a smaller toast library. Medium priority; execute after Phase 1 (01–03).

## Usage

- [Toast](apps/web/src/components/Toast/Toast.tsx) — `toast`, `Toaster`, `ToastOptions`, `Toast` from `react-hot-toast`; `showToast`, `showToastCustom`, and `<Toaster />`.
- [MembershipExpirationToast](apps/web/src/components/Toast/MembershipExpirationToast.tsx) — uses `toast` from `react-hot-toast`.
- Both are rendered in [layout](apps/web/src/app/layout.tsx), so react-hot-toast ships in the main bundle.

## Scope

- `apps/web/src/components/Toast/Toast.tsx`
- `apps/web/src/components/Toast/MembershipExpirationToast.tsx`
- `apps/web/src/app/layout.tsx`
- Any other consumers of `showToast` / `showToastCustom` / Toaster

## Implementation options

### Option A: Lazy-load Toast / Toaster

- Dynamically import the Toast component (and thus the Toaster) so it loads after initial paint. For example:
  - Render a lightweight placeholder in layout; use `next/dynamic` (or `React.lazy` + `Suspense`) to load the real Toast/Toaster client-side.
  - Ensure `showToast` / `showToastCustom` still work once the dynamic component has loaded (e.g. queue calls or no-op until loaded).
- **Trade-off**: Toasts may appear a moment later on first use.

### Option B: Replace with a smaller toast library

- Replace react-hot-toast with a lighter alternative (e.g. sonner, react-toastify) if it fits UX and reduces size.
- Refactor `Toast.tsx`, `MembershipExpirationToast.tsx`, and any direct `toast` usage to the new API.
- **Trade-off**: Requires UX review and possibly small behavior tweaks.

Choose Option A or B based on product constraints; both reduce main-bundle size from toast.

## Verification

1. `npm run build:packages` then `npm run build` in `apps/web`.
2. `cd tools/web-perf/bundle-analyzer && npm run analyze:web` with a new report name (e.g. `post-toast-optimization`).
3. Confirm react-hot-toast is reduced or removed from the main bundle.
4. Manually test: trigger success/error/custom toasts (e.g. auth flows, membership expiration); confirm they still appear and behave correctly.
5. `npm run lint` passes.

## Success criteria

- react-hot-toast no longer ships in the main bundle (Option A: lazy-loaded; Option B: replaced).
- Toast UX and behavior remain acceptable; no regressions for success, error, or custom toasts.
