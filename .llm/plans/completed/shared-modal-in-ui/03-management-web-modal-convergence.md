# 03 — Management-web overlay confirms

## Preconditions

`01-modal-in-packages-ui.md` is done.

## Goal

Replace inline `<div role="dialog">` + [`ConfirmPanel`](../../../../packages/ui/src/components/layout/ConfirmPanel/ConfirmPanel.tsx) wrappers with `<Modal>` from `@podverse/ui` so confirms match web’s fullscreen overlay + backdrop UX.

## Pages (six)

| File |
| --- |
| [`UsersListPageClient.tsx`](../../../../apps/management-web/src/app/(management)/users/UsersListPageClient.tsx) |
| [`UserDetailPageClient.tsx`](../../../../apps/management-web/src/app/(management)/users/[id]/UserDetailPageClient.tsx) |
| [`RowDetailPageClient.tsx`](../../../../apps/management-web/src/app/(management)/database/[table]/[id]/RowDetailPageClient.tsx) |
| [`FlagStatusPageClient.tsx`](../../../../apps/management-web/src/app/(management)/feed-operations/flag-status/FlagStatusPageClient.tsx) |
| [`StorageObjectDetailPageClient.tsx`](../../../../apps/management-web/src/app/(management)/storage/[key]/StorageObjectDetailPageClient.tsx) |
| [`StoragePageClient.tsx`](../../../../apps/management-web/src/app/(management)/storage/StoragePageClient.tsx) (three confirms) |

## Pattern

- `import { Modal, … } from '@podverse/ui'`.
- `<Modal isOpen={…} onClose={…} ariaLabel={t('…')} closeButtonAriaLabel={tc('…')}>` — wire `onClose` to the same state reset as Cancel today.
- **Remove** the outer `ConfirmPanel` wrapper (modal panel already provides chrome; avoid double box). Keep [`ConfirmPanelActions`](../../../../packages/ui/src/components/layout/ConfirmPanel/ConfirmPanel.tsx) for button rows where useful.
- Add `common.closeModalAria` (or similar) in [`apps/management-web/i18n/originals/en-US.json`](../../../../apps/management-web/i18n/originals/en-US.json); sync other locales per [`docs/localization/I18N.md`](../../../../docs/localization/I18N.md) / CI workflow.

## Flag status note

Confirm dialog is nested inside a long form; fixed overlay is acceptable and matches web.
