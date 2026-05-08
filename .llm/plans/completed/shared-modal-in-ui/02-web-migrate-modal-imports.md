# 02 — Migrate `apps/web` to `@podverse/ui` Modal

## Preconditions

`01-modal-in-packages-ui.md` is done (`Modal` exported from `@podverse/ui`).

## Goal

Remove the app-local Modal implementation; all web consumers import `{ Modal, MODAL_CONTENT_MAX_WIDTH }` from `@podverse/ui`.

## Steps

1. Grep `apps/web` for imports from `./Modal`, `Modal/Modal`, or `components/Modal/Modal` and update to `@podverse/ui`.
2. Add a **misc** (or appropriate namespace) key in [`apps/web/i18n/originals/en-US.json`](../../../../apps/web/i18n/originals/en-US.json) for the close icon aria-label (intent: same as today’s “Close modal”). Pass via `useTranslations` at each callsite as `closeButtonAriaLabel`.
3. Delete [`apps/web/src/components/Modal/Modal.tsx`](../../../../apps/web/src/components/Modal/Modal.tsx) and [`apps/web/src/styles/components/Modal/Modal.module.scss`](../../../../apps/web/src/styles/components/Modal/Modal.module.scss).
4. Leave feature-specific files under `apps/web/src/components/Modal/` (e.g. `ModalDisclaimer.tsx`) that only **compose** `Modal` — they should import from `@podverse/ui`.

## Files likely touched

Includes `Modal*.tsx` under `apps/web/src/components/Modal/`, [`MediaPlayerModal.tsx`](../../../../apps/web/src/components/MediaPlayer/Modal/MediaPlayerModal.tsx), settings modals under `Settings/Panels/SettingsAccount/`, etc. Confirm with repo-wide search after edits.
