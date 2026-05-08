---
name: modal-layout-contract
description: Modal overflow, Modal.Body / Modal.Actions, right-aligned wrapping action rows (web + management-web).
version: 1.0.0
---

# Modal layout contract (`@podverse/ui`)

**When to use:** Adding or changing dialogs (`Modal`), modal footers, or debugging horizontal scrollbars
inside modals in **apps/web**, **apps/management-web**, or **`packages/ui`** shells (`DeleteConfirmModalShell`,
`GoToPageModal`).

## Layout rules

- **`Modal`** sets **`--modal-content-max-width`** on the panel via inline style (default **580px** from **`MODAL_CONTENT_MAX_WIDTH`**).
  Override only with **`modalContentMaxWidth`** when needed. **Do not** add a **`var(..., 580px)`** fallback in SCSS — see **`css-custom-properties-no-var-fallbacks`**.
- **`Modal.Body`** — optional wrapper for stacked modal content: column flex, **`gap: var(--spacing-3xl)`**,
  **`min-width: 0`** so children cannot widen the panel.
- **`Modal.Actions`** — **the** standard footer for cancel/submit (and similar) inside **`Modal`**:
  **`justify-content: flex-end`**, **`flex-wrap: wrap`**, **`gap: var(--spacing-2xl)`**. Use in **both** web and
  management-web so confirm dialogs match the web baseline (right-aligned group).
- **Do not** use **`formButtonsWrapper`** / ad hoc **`display: flex; justify-content: flex-end`** rows for modal
  footers — use **`Modal.Actions`** (or **`DeleteConfirmModalShell`** / **`GoToPageModal`** which already compose it).
- **Do not** add **`overflow-x: hidden`** on the modal to mask overflow — fix the child (`min-width: 0` on flex
  items, **`Modal.Actions`** wrap, break long unbreakable strings).
- **`Modal`** applies **`scrollbar-gutter: stable`** on **`.modalChildren`** (the vertical scroll region), not on the
  padded panel wrapper, so when vertical scrolling appears the scrollbar does not steal horizontal space from body
  content and the header row is not narrowed by the gutter.
- **`.modalChildren > *`** and **`Modal.Body > *`** apply **`max-width: 100%`** and **`min-width: 0`** as a safety
  net; shared **`@podverse/ui`** form components should still declare **`min-width: 0`** on their own flex rows/columns
  ( **`FormStack`**, **`TextInput`** wrappers, **`FormDropdown`**, etc.) so content cannot widen the dialog.
- **DOM order:** secondary (**Cancel**) before primary (**Submit** / **Confirm**) inside **`Modal.Actions`** (same
  as **`form-primary-actions-row`**).

## Symptoms

- Horizontal scrollbar on the modal panel or the page when the modal is open → often **`Modal.Actions`** missing
  **`flex-wrap`** (use **`Modal.Actions`**, not a custom row), or a child with fixed width / **`min-width: auto`**
  in a flex context; also check nested flex rows without **`min-width: 0`** and vertical scrollbar appearing without
  **`scrollbar-gutter: stable`** on **`.modalChildren`**.

## Removed API

- **`ConfirmPanelActions`** was removed from **`@podverse/ui`** — use **`Modal.Actions`** inside **`Modal`** instead.
