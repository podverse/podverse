# @podverse/ui

Shared UI components for Podverse applications (see `package.json` for the public TypeScript entry).

## Styles

`@podverse/ui` exports SCSS sub-paths consumed by `apps/web` and `apps/management-web`:

- `@podverse/ui/styles/variables` — design tokens (CSS custom properties + SCSS-mirror variables) and breakpoints
- `@podverse/ui/styles/breakpoints` — breakpoint SCSS variables only
- `@podverse/ui/styles/themes` — `dark` / `light` / `dracula` / `violet` / `ember` / `dawn` theme blocks
- `@podverse/ui/styles/mixins` — shared SCSS mixins (media queries, layout, form, headers, buttons, **`flexItemAllowShrink`** / **`flexItemClampToParent`** in [`mixins/_flexShrink.scss`](src/styles/mixins/_flexShrink.scss), etc.)
- `@podverse/ui/styles/font-faces` — Roboto `@font-face` declarations + `body { font-family }`
- `@podverse/ui/styles/globals` — shared HTML element resets (`button`, `a`, headings, `p`, etc.) aligned with `apps/web`; both apps should `@use` this after themes so `@podverse/ui` controls inherit typography on controls.
- `@podverse/ui/styles` — full bundle (font-faces + variables + themes + **globals** + mixins)
- **`FontPreloads`** (`@podverse/ui`) — preload links for Roboto TTFs under each app’s `public/fonts/Roboto/`; include in the document `<head>` next to favicons.

See [`.cursor/skills/styles-source-of-truth/SKILL.md`](/.cursor/skills/styles-source-of-truth/SKILL.md) (repo root).

## Navigation — NavBar

[`NavBar`](src/components/navigation/NavBar/NavBar.tsx) is a structured composite: apps pass localized
strings, optional regions (`accountMenu`, `brand`, `mobileToggle`, `search`, `title`,
`trailingActions`), and branding via `brand.children`. `title` renders as the bar's `h1` after the
brand on large screens and is hidden at the `mobile` breakpoint. `trailingActions` renders in the
right cluster before the account menu (for app-level controls like a notifications bell). Exported types
(`NavBarCompositeProps`, `NavBarBrandProps`, etc.) live in that module and the package barrel — do not
duplicate them in prose docs.

**Rules:** No user-visible English defaults in `@podverse/ui`. See
[`.cursor/rules/shared-ui-i18n.mdc`](/.cursor/rules/shared-ui-i18n.mdc).

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
| Search          | `search.ariaLabel`                              | `aria-label` for search link control             |
| Title           | `title`                                         | Page title, already localized by the app         |
| Account trigger | `accountMenu.ariaLabel`                         | `aria-label` for account dropdown trigger        |
| Account rows    | `accountMenu.items[].label`                     | Row text for meta / link / action                |
| Mobile toggle   | `mobileToggle.openLabel`                        | `aria-label` when menu is closed                 |
| Mobile toggle   | `mobileToggle.closeLabel`                       | `aria-label` when menu is open                   |

Optional **`accountMenu.displayName`** is shown by the app when needed for the trigger; localization
policy stays in the app.

## Layout — MainHeader and the app bar title

Pages render [`MainHeader`](src/components/layout/MainHeader/MainHeader.tsx) with `title` and
optional `buttonsNode`. `buttonsNode` holds page actions and never enters the bar.

- Apps mount [`AppBarTitleProvider`](src/components/layout/AppBarTitle/AppBarTitle.tsx) around
  the chrome and pass `useAppBarTitle()` to `NavBar` `title`. `MainHeader` publishes its title
  with `usePublishAppBarTitle`. A page with no `MainHeader` leaves the bar title empty.
- Large screens: the title shows in the NavBar, and `MainHeader` renders only `buttonsNode`, as a
  right-aligned row on the content background.
- Small screens (the `mobile` mixin, 767px and below): `MainHeader` renders the title as its own
  row under the NavBar, with `buttonsNode` under the title.
- Each width exposes one `h1`: the NavBar title and the `MainHeader` title switch at the same
  breakpoint.
- Without a provider (tests, management-web), `MainHeader` still renders and publishes nothing.

## Navigation — Chips

[`Chip`](src/components/navigation/Chip/Chip.tsx),
[`ChipRow`](src/components/navigation/Chip/ChipRow.tsx),
[`MenuChip`](src/components/navigation/Chip/MenuChip.tsx), and
[`SortChip`](src/components/navigation/Chip/SortChip.tsx) are the list chip family. Every string
(labels, headings, menu names, accessible names) comes from the app.

### Variants

- **`pill`** picks which list shows (Podcasts, Episodes, …). Round; the selected pill fills with
  the primary button color.
- **`filter`** narrows the list (Category, Sort, the gear). Square radius in both states; the
  selected face gets an accent outline and accent label.

Every chip is a real `<button>` with a fixed height, so text, icon-only, and caret chips line up.
An icon-only chip throws without `aria-label`, the same contract as `IconButton`.

### `ChipRow`

- Order: the items, then `trailing` (Category, Sort, then the gear). Mount each trailing control
  only when the current item can use it; do not leave a disabled one to hold layout.
- Items keep the caller's order. Each item chip carries `aria-pressed` inside a `role="group"`.
- The row is one line at every width. It scrolls sideways when it does not fit, with no visible
  scrollbar, and the trailing controls scroll with the chips. On a wide screen where everything
  fits, nothing moves.
- The selected chip is scrolled fully into view on mount (a jump) and on every selection change
  (animated, or instant under reduced motion). A swipe afterwards is left alone. The offset comes
  from `getChipRevealOffset` in `@podverse/helpers/chipRowReveal`, shared with mobile.
- The row has no outer margin; the caller's `className` sets outer spacing.
- A `ChipRow` item may set `hideDesktop`, which hides that chip from 1200px up.

### `MenuChip` and `SortChip`

- `MenuChip` is a filter chip with a one-step menu (the gear). `SortChip` is one chip for the list
  order: the face is the current sort, or the range while the range sort (Top) is selected.
  Choosing Top swaps the open menu to the range options, and `onChange` fires only once a range
  is chosen. When `options` is exactly the range sort, every open starts on the range list.
- Menus show the current option as a checked radio item (`menuitemradio` with `aria-checked`)
  and carry an accessible name.
- Their menus render in a portal on `document.body`, anchored to the chip (`DropdownMenuPanel`
  `anchorRef`), so the row's scroller cannot clip them. They follow the chip on scroll and
  resize, and close with no selection once the chip is scrolled fully out of sight. `position`
  picks which chip edge the menu lines up with.
- Playwright and Testing Library find these menus from the page or `screen`, not inside the row.

### `DropdownMenuPanel` placement

Only the chip menus pass `anchorRef`. Every other `DropdownMenuPanel` caller (`Dropdown`,
`MoreButton`, `SettingsButton`, the app menus) omits it and keeps the in-place menu, absolutely
positioned inside its wrapper.

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

- **`useTableFilterState`** — debounced search, URL or cookie sync, optional funnel columns; **`clearSearch`** empties the term and applies it at once.
- **`useDeleteModal`** — open/close delete confirmation target id.
- **`useAsyncPageLoading`**, **`useCookieModeListRefresh`** — list refresh after mutations when using cookie-mode filters.
- **`useCursorPagination`** — cursor next/prev for **`CursorPagination`**.

### Composites

- **`TableFilterBar`** — search field with an in-field clear X (**`clearFilterAriaLabel`**, **`onSearchClear`**; `TableWithFilter` passes `labels.clearFilterAriaLabel` and `filter.clearSearch`) + funnel (**`PopoverIcon`**) with per-column “search here” toggles from **`columns`**.
- **`TableWithSort`** — renders **`<thead>`** from typed **`columns`**; sortable headers use **`Table.SortableHeaderCell`**; optional **`sortPrefsCookieName`** / **`sortPrefsListKey`** merge sort into the browser cookie; body is **`children`** (caller supplies **`<tbody>`**).
- **`TableWithFilter`** — **`TableFilterBar`** + **`TableWithSort`** + optional **`Pagination`**; **`paginationMode`**
  **`'page'`** | **`'none'`**; **`renderCells`**; optional **`bulkSelect`** (prepends select header/cells only). When
  **`rows`** is empty, the sortable table is not rendered; optional **`emptyState`** is shown below the filter row
  inside **`role="status"`**. State sync **`'url'`** | **`'cookie'`**.
- **`BulkActionBar`** — summary + action buttons + clear; used by **`ResourceTableWithFilter`** when **`bulkSelect.toolbarActions`** is set and the selection is non-empty.
- **`ResourceTableWithFilter`** — wraps **`TableWithFilter`** with fixed **`RowActions`** (view / edit / delete icons from **`actions`** + **`getRowActions`** policy), **`DeleteConfirmModalShell`** + **`useDeleteModal`**, **`paginationMode`** **`'page'`** | **`'cursor'`** | **`'none'`** (cursor uses **`CursorPagination`** below the table), optional **`bulkSelect`** (select columns + **`BulkActionBar`**), optional **`groupedSections`** (shared filter row, one **`Disclosure`** per section with its own table body; bulk selection is not used for grouped mode).
- **`FilterTablePageLayout`** — page chrome: **`title`**, optional **`subtitle`**, **`breadcrumbs`**, **`headerActions`**, **`error`** with **`role="alert"`**, **`children`**. Does not include **`ManagementPageShell`**; management-web composes shell + layout at the call site.

### Pagination helpers

- **`Pagination`**, **`PaginationStrip`**, **`GoToPageModal`**, **`EditValueModal`**, **`CursorPagination`**, **`PaginatedSection`** — see barrel exports in [`index.ts`](src/index.ts) for props types.
