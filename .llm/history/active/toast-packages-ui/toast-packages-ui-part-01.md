# toast-packages-ui

**Started:** 2026-05-07  
**Author:** Agent  
**Context:** Move Toast from `apps/web` into `@podverse/ui`.

---

### Session 1 - 2026-05-07

#### Prompt (Developer)

move the toast component in web to packages/ui

#### Key Decisions

- Implemented **Toast** in **`packages/ui/src/components/feedback/Toast/`** (SCSS + **`ToastImpl`**): **react-hot-toast** is a **`@podverse/ui`** dependency; uses **`TOAST_DURATION_MS`** from **`@podverse/helpers`**.
- **No** `next-intl` / **Next `Link` inside shared UI**: **`CustomToastProps`** requires **`dismissButtonAriaLabel`**; optional **`LinkComponent`** for app routers. **`MembershipExpirationToast`** passes **`Link`** + **`tMisc('dismiss')`**.
- **`package.json` `exports`** add **`./toast`** for **`import('@podverse/ui/toast')`** so **`apps/web`** keeps lazy-loading and a thin **`Toast.tsx`** barrel re-exporting the same public API.
- Removed **`apps/web`** **`ToastImpl.tsx`**, **Toast SCSS**, and direct **`react-hot-toast`** dependency; root **`package-lock.json`** updated for **`@podverse/ui`**.

#### Files Created/Modified

- `packages/ui/src/components/feedback/Toast/ToastImpl.tsx`
- `packages/ui/src/components/feedback/Toast/Toast.module.scss`
- `packages/ui/src/components/feedback/Toast/index.ts`
- `packages/ui/package.json`, `package-lock.json`
- `packages/ui/src/index.ts`
- `packages/ui/PACKAGES-UI.md`
- `apps/web/src/components/Toast/Toast.tsx`
- `apps/web/src/components/Toast/MembershipExpirationToast.tsx`
- Deleted `apps/web/src/components/Toast/ToastImpl.tsx`, `apps/web/src/styles/components/Toast/Toast.module.scss`
- `apps/web/package.json`
