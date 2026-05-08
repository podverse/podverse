# modal-layout-contract-refactor

## Started

2026-05-07

## Context

Implement modal layout contract: fix overflow, Modal.Body / Modal.Actions, migrate call sites, remove ConfirmPanelActions, add skill.

### Session 1 - 2026-05-07

#### Prompt (Developer)

implement plan

#### Key Decisions

- **Modal (`@podverse/ui`):** `.modalRoot` padding + `overflow: hidden`; `.modalContent` uses `--modal-content-max-width` (default 580px), `min-width: 0`, `max-width: min(var, calc(100vw - 1.5rem))`; `.modalChildren` `flex` + `min-width: 0`; transparent modifier keeps prior fullscreen-player behavior without removing box-shadow.
- **`Modal.Body` / `ModalActions`:** Exported and attached as `Modal.Body` / `Modal.Actions` via `Object.assign`; actions row is right-aligned with `flex-wrap: wrap` and `--spacing-2xl` gap.
- **Removed `ConfirmPanelActions`** from `ConfirmPanel` and barrel; management-web modals and `DeleteConfirmModalShell` / `GoToPageModal` use `ModalActions`.
- **Apps/web:** Dropped redundant `modalContentMaxWidth={MODAL_CONTENT_MAX_WIDTH}`; migrated modal and form action rows to `ModalActions` where applicable; removed obsolete modal SCSS modules (`ModalBoostMessageError`, `ModalBoostMintRateLimit`).
- **Docs/skills:** Added `modal-layout-contract` skill; updated `form-primary-actions-row`, `reusable-components`, root `AGENTS.md`, `apps/web/AGENTS.md`, `apps/management-web/AGENTS.md`, `PACKAGES-UI.md`.

#### Files Created/Modified

- `packages/ui/src/components/layout/Modal/Modal.tsx`
- `packages/ui/src/components/layout/Modal/Modal.module.scss`
- `packages/ui/src/components/layout/Modal/Modal.test.tsx`
- `packages/ui/src/components/layout/ConfirmPanel/ConfirmPanel.tsx`
- `packages/ui/src/components/layout/ConfirmPanel/ConfirmPanel.module.scss`
- `packages/ui/src/components/layout/ConfirmPanel/index.ts`
- `packages/ui/src/components/layout/DeleteConfirmModalShell/DeleteConfirmModalShell.tsx`
- `packages/ui/src/components/navigation/GoToPageModal/GoToPageModal.tsx`
- `packages/ui/src/index.ts`
- `packages/ui/PACKAGES-UI.md`
- `apps/web/src/components/Modal/*.tsx` (multiple)
- `apps/web/src/components/Settings/Panels/SettingsAccount/ModalChangeEmail.tsx`
- `apps/web/src/components/Settings/Panels/SettingsAccount/ModalDeleteAccount.tsx`
- `apps/web/src/styles/components/Modal/ModalAuthLogin.module.scss`
- `apps/web/src/styles/components/Modal/ModalChangeEmail.module.scss`
- `apps/web/src/styles/components/Modal/ModalDeleteAccount.module.scss`
- Deleted `apps/web/src/styles/components/Modal/ModalBoostMessageError.module.scss`
- Deleted `apps/web/src/styles/components/Modal/ModalBoostMintRateLimit.module.scss`
- `apps/web/src/components/Boost/BoostFormBase.tsx`
- `apps/web/src/styles/components/Boost/BoostForm.module.scss`
- `apps/web/src/components/Clip/ClipForm.tsx`
- `apps/web/src/styles/components/Clip/ClipForm.module.scss`
- `apps/management-web/src/app/(management)/storage/StoragePageClient.tsx`
- `apps/management-web/src/app/(management)/users/[id]/UserDetailPageClient.tsx`
- `apps/management-web/src/app/(management)/storage/[key]/StorageObjectDetailPageClient.tsx`
- `apps/management-web/src/app/(management)/feed-operations/flag-status/FlagStatusPageClient.tsx`
- `apps/management-web/src/app/(management)/database/[table]/[id]/RowDetailPageClient.tsx`
- `.cursor/skills/modal-layout-contract/SKILL.md`
- `.cursor/skills/form-primary-actions-row/SKILL.md`
- `.cursor/skills/reusable-components/SKILL.md`
- `AGENTS.md`
- `apps/web/AGENTS.md`
- `apps/management-web/AGENTS.md`

### Session 2 - 2026-05-07

#### Prompt (Developer)

@podverse/packages/ui/src/components/layout/Modal/Modal.module.scss:93 we don't want fallback css to be used for vars. there should be a skill to remind you of this. we want to just ensure that the vars exist without fallbacks

#### Key Decisions

- **`Modal.module.scss`:** `max-width` uses **`var(--modal-content-max-width)`** only (no `580px` fallback); **`Modal.tsx`** already sets the variable whenever the dialog is open.
- Added **`.cursor/skills/css-custom-properties-no-var-fallbacks/SKILL.md`**; linked from **`styles-source-of-truth`**, **`modal-layout-contract`**, root **`AGENTS.md`**, and clarified **`PACKAGES-UI.md`** Modal section.

#### Files Created/Modified

- `packages/ui/src/components/layout/Modal/Modal.module.scss`
- `.cursor/skills/css-custom-properties-no-var-fallbacks/SKILL.md`
- `.cursor/skills/styles-source-of-truth/SKILL.md`
- `.cursor/skills/modal-layout-contract/SKILL.md`
- `AGENTS.md`
- `packages/ui/PACKAGES-UI.md`
- `.llm/history/active/modal-layout-contract-refactor/modal-layout-contract-refactor-part-01.md`

### Session 3 - 2026-05-07

#### Prompt (Developer)

implement

#### Key Decisions

- **`Modal.module.scss`:** **`scrollbar-gutter: stable`** on **`.modalContent`**; **`.modalChildren > *`** and **`.modalBody > *`** enforce **`max-width: 100%`** / **`min-width: 0`**; **`min-width: 0`** on **`.modalActions`**.
- **Shared form SCSS:** **`min-width: 0`** (and ellipsis on **`FormDropdown`** selected text) on **`FormStack`**, **`TextInput`** wrappers/input, **`FormDropdown`**, **`TextInputHHMMSS`**, **`RadioButton`**, **`CheckboxField`**, **`CheckboxFieldList`**.
- **Tests:** **`Modal.test.tsx`** — scrollbar-gutter when computed style is supported; structural test for **`modalChildren`**; **`TextInput.test.tsx`** — smoke + wrapper nesting.
- **Docs:** **`modal-layout-contract`** skill and **`PACKAGES-UI.md`** updated for gutter + defensive children + form **`min-width`** discipline.

#### Files Created/Modified

- `packages/ui/src/components/layout/Modal/Modal.module.scss`
- `packages/ui/src/components/layout/Modal/Modal.test.tsx`
- `packages/ui/src/components/form/TextInput/TextInput.module.scss`
- `packages/ui/src/components/form/TextInput/TextInput.test.tsx`
- `packages/ui/src/components/form/FormStack/FormStack.module.scss`
- `packages/ui/src/components/form/FormDropdown/FormDropdown.module.scss`
- `packages/ui/src/components/form/TextInputHHMMSS/TextInputHHMMSS.module.scss`
- `packages/ui/src/components/form/RadioButton/RadioButton.module.scss`
- `packages/ui/src/components/form/CheckboxField/CheckboxField.module.scss`
- `packages/ui/src/components/form/CheckboxFieldList/CheckboxFieldList.module.scss`
- `packages/ui/PACKAGES-UI.md`
- `.cursor/skills/modal-layout-contract/SKILL.md`

### Session 4 - 2026-05-08

#### Prompt (Developer)

Flex-shrink SCSS mixins (`flexItemAllowShrink` / `flexItemClampToParent`)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added **`packages/ui/src/styles/mixins/_flexShrink.scss`** with **`flexItemAllowShrink`** (`min-width: 0` only) and **`flexItemClampToParent`** (`min-width: 0` + `max-width: 100%`); forwarded from **`packages/ui/src/styles/_mixins.scss`**; **`ellipsisSingleLineParent`** uses **`flexItemAllowShrink`** via **`packages/ui/src/styles/mixins/_ellipsis.scss`**.
- Refactored **`packages/ui`** component SCSS and listed **`apps/web`** SCSS to **`@include`** these mixins; added **`apps/web/src/styles/mixins/flexShrink.scss`** forwarder for **`@use …/mixins/flexShrink`**.
- Documented in **`PACKAGES-UI.md`** and **`styles-source-of-truth`** skill.

#### Files Created/Modified

- `packages/ui/src/styles/mixins/_flexShrink.scss`
- `packages/ui/src/styles/_mixins.scss`
- `packages/ui/src/styles/mixins/_ellipsis.scss`
- All `packages/ui` `*.module.scss` that previously used bare `min-width: 0` (Modal, form components, layout, NavBar, tables, Button, Image, etc.)
- `apps/web/src/styles/mixins/flexShrink.scss`
- `apps/web/src/components/Boost/messages/BoostMessagesSection.module.scss`
- `apps/web/src/styles/components/AddByRSS/List/AddByRSSList.module.scss`
- `apps/web/src/styles/components/SourceSelectors/SourceSelectorRow.module.scss`
- `apps/web/src/styles/components/MediaPlayer/Modal/MediaPlayerInfoModal.module.scss`
- `apps/web/src/styles/components/Common/Item/CommonItemHeader.module.scss`
- `packages/ui/PACKAGES-UI.md`
- `.cursor/skills/styles-source-of-truth/SKILL.md`
- `.llm/history/active/modal-layout-contract-refactor/modal-layout-contract-refactor-part-01.md`

### Session 5 - 2026-05-08

#### Prompt (Developer)

Fix TextInput wrapper overflow in modal

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- **`formInputWrapper`** (`packages/ui/src/styles/mixins/_form.scss`): **`box-sizing: border-box`** so **`width: 100%`** on bordered/padded wrappers does not extend past the parent.
- **`TextInput` `.input`** (`packages/ui/src/components/form/TextInput/TextInput.module.scss`): **`box-sizing: border-box`** immediately after **`all: unset`** so **`width: 100%`** includes padding.
- No **`overflow: hidden`** on **`textInputWrapper`** (address root sizing first).

#### Files Created/Modified

- `packages/ui/src/styles/mixins/_form.scss`
- `packages/ui/src/components/form/TextInput/TextInput.module.scss`
- `.llm/history/active/modal-layout-contract-refactor/modal-layout-contract-refactor-part-01.md`
