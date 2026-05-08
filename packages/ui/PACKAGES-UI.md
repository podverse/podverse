# @podverse/ui

Shared UI components for Podverse applications (see `package.json` for the public TypeScript entry).

## Styles

`@podverse/ui` exports SCSS sub-paths consumed by `apps/web` and `apps/management-web`:

- `@podverse/ui/styles/variables` — design tokens (CSS custom properties + SCSS-mirror variables) and breakpoints
- `@podverse/ui/styles/breakpoints` — breakpoint SCSS variables only
- `@podverse/ui/styles/themes` — `dark` / `light` / `dracula` / `violet` theme blocks
- `@podverse/ui/styles/mixins` — shared SCSS mixins (media queries, layout, form, headers, buttons, **`flexItemAllowShrink`** / **`flexItemClampToParent`** in [`mixins/_flexShrink.scss`](src/styles/mixins/_flexShrink.scss), etc.)
- `@podverse/ui/styles/font-faces` — Roboto `@font-face` declarations + `body { font-family }`
- `@podverse/ui/styles/globals` — shared HTML element resets (`button`, `a`, headings, `p`, etc.) aligned with `apps/web`; both apps should `@use` this after themes so `@podverse/ui` controls inherit typography on controls.
- `@podverse/ui/styles` — full bundle (font-faces + variables + themes + **globals** + mixins)
- **`FontPreloads`** (`@podverse/ui`) — preload links for Roboto TTFs under each app’s `public/fonts/Roboto/`; include in the document `<head>` next to favicons.

See [`.cursor/skills/styles-source-of-truth/SKILL.md`](../../.cursor/skills/styles-source-of-truth/SKILL.md) (repo root).

## Navigation — NavBar

[`NavBar`](src/components/navigation/NavBar/NavBar.tsx) is a structured composite: apps pass localized
strings, optional regions (`accountMenu`, `backForward`, `brand`, `mobileToggle`, `search`), and
branding via `brand.children`. Exported types (`NavBarCompositeProps`, `NavBarBrandProps`, etc.) live
in that module and the package barrel — do not duplicate them in prose docs.

**Rules:** No user-visible English defaults in `@podverse/ui`. See
[`.cursor/rules/shared-ui-i18n.mdc`](../../.cursor/rules/shared-ui-i18n.mdc).

### Link injection (`LinkComponent`)

**Brand and search** (`NavBarLinkComponentProps`): default `<a>`. For Next.js, pass `next/link`; the
composite forwards **`href`**, **`className`**, **`children`**, and optional **`aria-label`** — a
narrower surface than dropdown link items.

**Account menu** (`DropdownMenuLinkComponentProps`): same contract as `DropdownMenu.LinkItem`
(`href`, `children`, `className`, optional `onClick`, `role`, `aria-selected`). Defaults follow
`DropdownMenuLinkItem`. Meta and action rows do not use `LinkComponent`.

### i18n — strings apps supply

| Area            | Prop path                                       | Purpose                                          |
| --------------- | ----------------------------------------------- | ------------------------------------------------ |
| Brand           | `brand.children` (and optional `linkClassName`) | App provides logo or text; alt on `Image` in app |
| Back / forward  | `backForward.backLabel`                         | Accessible label for back control                |
| Back / forward  | `backForward.forwardLabel`                      | Accessible label for forward control             |
| Search          | `search.ariaLabel`                              | `aria-label` for search link control             |
| Account trigger | `accountMenu.ariaLabel`                         | `aria-label` for account dropdown trigger        |
| Account rows    | `accountMenu.items[].label`                     | Row text for meta / link / action                |
| Mobile toggle   | `mobileToggle.openLabel`                        | `aria-label` when menu is closed                 |
| Mobile toggle   | `mobileToggle.closeLabel`                       | `aria-label` when menu is open                   |

Optional **`accountMenu.displayName`** is shown by the app when needed for the trigger; localization
policy stays in the app.

## Layout — ToolbarCluster

[`ToolbarCluster`](src/components/layout/ToolbarCluster/ToolbarCluster.tsx) is a horizontal flex row
with wrap, **`align-items: center`**, and spacing for filter and action bars so siblings (native
selects, **`TextInput`**, **`Button`**, etc.) stay vertically centered as a row. Avoid imposing a much
larger **`min-height`** on one slot than others (e.g. **`LookupFieldGrid`** **`inlineControl`**) next
to compact **`Button`** **`mini`** controls unless every slot matches. For lookup rows where each control
uses an in-field **`eyebrow`** on **`TextInput`** / **`FormDropdown`**, use **`LookupFieldGrid`**
**`variant="inlineEyebrow"`** so the action column **`align-items: end`** lines up with the control
chrome (see [`LookupFieldGrid.tsx`](src/components/layout/LookupFieldGrid/LookupFieldGrid.tsx)).

## Forms — vertical rhythm

- **`StackForm`** ([`StackForm.tsx`](src/components/form/StackForm/StackForm.tsx)) — native `<form>` with
  **`flex`** column **`gap: var(--spacing-3xl)`** (same stack class as **`FormStack`**). Prefer this for
  submit handlers when fields and sections share one vertical rhythm (**`Modal.Body`** uses the same gap
  token).
- **`FormStack`** — same spacing as **`StackForm`** for stacked content that is not a `<form>` (filters,
  modal sections, layout between blocks).
- **`FormContainer`** ([`FormContainer.tsx`](src/components/form/FormContainer/FormContainer.tsx)) —
  `<form>` with **`max-width: var(--form-max-width-md)`** only (no root **`gap`**). For stacked fields with
  shared rhythm, use **`StackForm`** and **`FormMaxWidth`** when you need the same width cap, or apply the
  width rule via **`className`** on **`StackForm`**.
- **`FormPrimaryActions`** ([`FormPrimaryActions.tsx`](src/components/form/FormPrimaryActions/FormPrimaryActions.tsx))
  — right-aligned Cancel + Primary submit row. Vertical space before this row comes from the parent
  **`StackForm`** / **`FormStack`** / **`Modal.Body`** **`gap`**, not from extra margin on the actions row.
- **`FormGroup`** — optional **`layout="inStack"`** when the group is a direct child of **`StackForm`** /
  **`FormStack`** so internal margins do not stack with the parent **`gap`**.
- **`CheckboxFieldList`** — optional **`eyebrow`** for the same small title line as **`TextInput`** /
  **`FormDropdown`** ([`CheckboxFieldList.tsx`](src/components/form/CheckboxFieldList/CheckboxFieldList.tsx)).

## Feedback — Toast

[`Toast`](src/components/feedback/Toast/ToastImpl.tsx) integrates **react-hot-toast**: imperative helpers (**`showToast`**, **`showToastPromise`**, **`showToastCustom`**, etc.) and a **`Toast`** renderer (**`<Toaster />`**). Styling uses theme tokens (`--background-color-contrast`, `--button-warning-*`, `--button-danger-*`). Custom membership-style toasts require localized **`dismissButtonAriaLabel`** and optionally **`LinkComponent`** (e.g. Next.js `Link`). Apps may lazy-load via **`import('@podverse/ui/toast')`** (`package.json` **`exports`** entry **`./toast`**) to keep the toast bundle split.

## Layout — Modal

[`Modal`](src/components/layout/Modal/Modal.tsx) is a fixed overlay dialog with optional header row,
optional absolute close when there is no header title, and theme tokens (`--shadow-modal`,
`--spacing-modal-padding`). Pass **`ariaLabel`** for the dialog; when **`onClose`** is provided,
**`closeButtonAriaLabel`** is required for the dismiss control(s). The content panel receives **`--modal-content-max-width`** from **`Modal`** (default **580px** via **`MODAL_CONTENT_MAX_WIDTH`**); override with **`modalContentMaxWidth`** only when needed. SCSS references **`var(--modal-content-max-width)`** without a fallback — the component always sets the variable when open.

Use **`Modal.Body`** for stacked modal content (column gap **`--spacing-3xl`**) and **`Modal.Actions`**
for primary/secondary controls: **right-aligned**, **`flex-wrap: wrap`**, gap **`--spacing-2xl`** (web
and management-web standard). Do not use **`formButtonsWrapper`** or a left-aligned action row inside
modals.

The **`.modalChildren`** scroll host uses **`scrollbar-gutter: stable`** so vertical scroll does not compress body content horizontally; the header row stays full width inside the padded panel.
**`.modalChildren > *`** enforces **`min-width: 0`** / **`max-width: 100%`** on direct children; shared form
components (**`FormStack`**, **`TextInput`**, **`FormDropdown`**, etc.) also use **`min-width: 0`** on flex
containers so fields stay within the max width.

## Table family (list / filter / CRUD)

Primitives and composites for admin-style list pages. Apps pass **localized strings** via props; **`@podverse/ui`** does not embed copy.

### Primitives

- **`Table`** — [`Table.tsx`](src/components/table/Table/Table.tsx): **`HeaderCell`**, **`SortableHeaderCell`** (phase 02), body cells, **`RowActions`**, icon links/buttons (**`Table.IconViewLink`**, **`IconEditLink`**, **`IconDeleteButton`**, **`IconActionLink`**).
- **Cookies / sort prefs** — **`mergeSortPrefsCookie`**, **`readSortPrefsMap`**, **`serializeSortPrefsMap`** ([`sortPrefsCookie.ts`](src/lib/cookies/sortPrefsCookie.ts)); **`mergeSortPrefsInBrowserCookie`**, **`readBrowserCookie`**, **`writeBrowserCookie`**, **`TABLE_LIST_COOKIE_MAX_AGE_SECONDS`** ([`browserCookies.ts`](src/lib/cookies/browserCookies.ts)); table-list state cookie helpers ([`tableListStateCookie.ts`](src/lib/cookies/tableListStateCookie.ts)).

### Hooks (phase 02)

- **`useTableFilterState`** — debounced search, URL or cookie sync, optional funnel columns.
- **`useDeleteModal`** — open/close delete confirmation target id.
- **`useAsyncPageLoading`**, **`useCookieModeListRefresh`** — list refresh after mutations when using cookie-mode filters.
- **`useCursorPagination`** — cursor next/prev for **`CursorPagination`**.

### Composites

- **`TableFilterBar`** — search field + funnel (**`PopoverIcon`**) with per-column “search here” toggles from **`columns`**.
- **`TableWithSort`** — renders **`<thead>`** from typed **`columns`**; sortable headers use **`Table.SortableHeaderCell`**; optional **`sortPrefsCookieName`** / **`sortPrefsListKey`** merge sort into the browser cookie; body is **`children`** (caller supplies **`<tbody>`**).
- **`TableWithFilter`** — **`TableFilterBar`** + **`TableWithSort`** + optional **`Pagination`**; **`paginationMode`**
  **`'page'`** | **`'none'`**; **`renderCells`**; optional **`bulkSelect`** (prepends select header/cells only). When
  **`rows`** is empty, the sortable table is not rendered; optional **`emptyMessage`** is shown below the filter row
  inside **`role="status"`**. State sync **`'url'`** | **`'cookie'`**.
- **`BulkActionBar`** — summary + action buttons + clear; used by **`ResourceTableWithFilter`** when **`bulkSelect.toolbarActions`** is set and the selection is non-empty.
- **`ResourceTableWithFilter`** — wraps **`TableWithFilter`** with fixed **`RowActions`** (view / edit / delete icons from **`actions`** + **`getRowActions`** policy), **`DeleteConfirmModalShell`** + **`useDeleteModal`**, **`paginationMode`** **`'page'`** | **`'cursor'`** | **`'none'`** (cursor uses **`CursorPagination`** below the table), optional **`bulkSelect`** (select columns + **`BulkActionBar`**), optional **`groupedSections`** (shared filter row, one **`Disclosure`** per section with its own table body; bulk selection is not used for grouped mode).
- **`FilterTablePageLayout`** — page chrome: **`title`**, optional **`subtitle`**, **`breadcrumbs`**, **`headerActions`**, **`error`** with **`role="alert"`**, **`children`**. Does not include **`ManagementPageShell`**; management-web composes shell + layout at the call site.

### Pagination helpers

- **`Pagination`**, **`PaginationStrip`**, **`GoToPageModal`**, **`EditValueModal`**, **`CursorPagination`**, **`PaginatedSection`** — see barrel exports in [`index.ts`](src/index.ts) for props types.
