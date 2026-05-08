# Phase 04 — Migrate standard list pages

## Goal

Migrate every "standard" list page in `apps/management-web` onto the wrappers from phase 03.
Hard breaks on style are accepted: action cells become icons, sort headers become
`Table.SortableHeaderCell`, page-of pagination uses shared `Pagination`, and toolbars use
`TableFilterBar` + `trailingToolbar`.

Storage and Workers are out of scope here (phases 05 and 06).

## Migration order (lowest risk first)

1. Product memberships (read-only table, smallest behavioral surface).
2. Stats (read-only + row selection; no CRUD modals).
3. Users (full `ResourceTableWithFilter` + delete modal pattern already matches Locked contracts).
4. Admins (`getRowActions` policy + non-canonical list shape).
5. Flag status directory (toolbar + view-only actions).
6. Database table browser (dynamic columns + meta read-only; duplicate route deletion).

## Cross-cutting (do first in this phase)

1. **Thin app-local wrapper:** add
   [`apps/management-web/src/components/Table/ManagementResourceTable.tsx`](../../../../apps/management-web/src/components/Table/ManagementResourceTable.tsx)
   (name may vary) that wires `useTranslations('tableShared')`, `next/link` `Link`, and shared
   aria-label templates for icon actions. First migrated page **creates** this file; later pages
   **reuse** it per [thin-ui-wrappers-web-management](../../../../.llm/plans/completed/thin-ui-wrappers-web-management/00-EXECUTION-ORDER.md).
2. **i18n:** add keys from [`01-i18n-keys.md`](./01-i18n-keys.md) to
   [`apps/management-web/i18n/originals/en-US.json`](../../../../apps/management-web/i18n/originals/en-US.json);
   prune obsolete keys when copy moves to `tableShared`.

---

### 1. Product memberships

- **File:**
  [`ProductMembershipsPageClient.tsx`](../../../../apps/management-web/src/app/(management)/products/memberships/ProductMembershipsPageClient.tsx).
- **Backend pre-check:** `GET /product/membership` + `GET /product/pricing/active` via
  [`productMembership.ts`](../../../../apps/management-web/src/lib/requests/productMembership.ts),
  [`productPricing.ts`](../../../../apps/management-web/src/lib/requests/productPricing.ts). Not a
  paginated list API — rows come from **`pricingRows`** in memory. **Adapter:** map
  `ProductPricingRow[]` → wrapper `rows`; no canonical `{ items, pagination }` unless pagination is
  added later.
- **Wrapper:** `TableWithSort` or `TableWithFilter` with `paginationMode: 'none'` (read-only,
  no server pagination).
- **E2E:** Extend [`e2e/products-hub.spec.ts`](../../../../apps/management-web/e2e/products-hub.spec.ts)
  with assertions on the pricing table chrome **or** add **`e2e/products-memberships-table.spec.ts`**
  (net-new). Existing hub test already navigates to Memberships.

```bash
make e2e_test_management_web_report_spec SPEC=e2e/products-hub.spec.ts
```

---

### 2. Stats

- **File:**
  [`StatsPageClient.tsx`](../../../../apps/management-web/src/app/(management)/stats/StatsPageClient.tsx).
- **Backend pre-check:** [`stats.ts`](../../../../apps/management-web/src/lib/requests/stats.ts) —
  `GET /stats/top/:entityType`, `GET /stats/detail/...`, `GET /stats/search/...`. Top-entities list
  shape is domain-specific; **adapter** in the client maps API rows → wrapper `rows` + optional
  pagination totals from existing response fields.
- **Wrapper:** `TableWithFilter` (no actions column). Row click selects detail; selection styling via
  `Table.Row` selected state.
- **E2E:** Update [`e2e/stats-page.spec.ts`](../../../../apps/management-web/e2e/stats-page.spec.ts).

```bash
make e2e_test_management_web_report_spec SPEC=e2e/stats-page.spec.ts
```

---

### 3. Users

- **File:**
  [`UsersListPageClient.tsx`](../../../../apps/management-web/src/app/(management)/users/UsersListPageClient.tsx).
- **Backend pre-check:** `GET /users` → [`ListUsersResponse`](../../../../apps/management-web/src/lib/requests/users.ts)
  uses **`users`** not `items`. **Adapter:** `{ items: users, pagination }` at the boundary.
- **Wrapper:** `ResourceTableWithFilter`, `paginationMode: 'page'`.
- **E2E:** **Net-new** recommended:
  [`e2e/users-list.spec.ts`](../../../../apps/management-web/e2e/users-list.spec.ts) (sort header,
  pagination, delete modal). Optionally fold minimal checks into [`e2e/smoke.spec.ts`](../../../../apps/management-web/e2e/smoke.spec.ts)
  only if team prefers a single smoke file.

```bash
make e2e_test_management_web_report_spec SPEC=e2e/users-list.spec.ts
```

---

### 4. Admins

- **File:**
  [`AdminsListPageClient.tsx`](../../../../apps/management-web/src/app/(management)/admins/AdminsListPageClient.tsx).
- **Backend pre-check:** `GET /admins` returns **`AdminAccount[]`** (bare array). **Adapter:**
  `{ items: admins, pagination: { page: 1, totalPages: 1 } }` client-side unless server gains real
  pagination later.
- **Wrapper:** `ResourceTableWithFilter` with **`getRowActions`** per Locked contracts (superuser
  rules unchanged).
- **E2E:** **Net-new** [`e2e/admins-list.spec.ts`](../../../../apps/management-web/e2e/admins-list.spec.ts)
  recommended.

```bash
make e2e_test_management_web_report_spec SPEC=e2e/admins-list.spec.ts
```

---

### 5. Flag status directory

- **File:**
  [`FlagStatusPageClient.tsx`](../../../../apps/management-web/src/app/(management)/feed-operations/flag-status/FlagStatusPageClient.tsx).
- **Backend pre-check:** [`feedFlagStatus.ts`](../../../../apps/management-web/src/lib/requests/feedFlagStatus.ts) —
  `GET /feed-operations/list?...`. Map response feeds → `items` + pagination fields per existing client.
- **Wrapper:** `ResourceTableWithFilter` (view-only); lifecycle `<select>` in **`trailingToolbar`**;
  replace text **Open** with `Table.IconViewLink`.
- **E2E:** [`e2e/feed-operations-flag-status.spec.ts`](../../../../apps/management-web/e2e/feed-operations-flag-status.spec.ts).

```bash
make e2e_test_management_web_report_spec SPEC=e2e/feed-operations-flag-status.spec.ts
```

---

### 6. Database table browser

- **Files:**
  [`(management)/database/[table]/TableBrowserPageClient.tsx`](../../../../apps/management-web/src/app/(management)/database/[table]/TableBrowserPageClient.tsx)
  and remove duplicate
  [`dashboard/database/[table]/TableBrowserPageClient.tsx`](../../../../apps/management-web/src/app/dashboard/database/[table]/TableBrowserPageClient.tsx)
  after verifying routing / adding redirect to `/(management)/database/[table]`.
- **Backend pre-check:** [`database.ts`](../../../../apps/management-web/src/lib/requests/database.ts) —
  `POST /database/:table/query` returns **`rows`** + **`columns`** metadata. **Adapter:** map `rows`
  to `items`; derive column defs from `meta` / API for `TableWithSort` headers.
- **Wrapper:** `ResourceTableWithFilter`; view-only vs view+edit from `meta.readOnly`.
- **E2E:** **Net-new** [`e2e/database-table-browser.spec.ts`](../../../../apps/management-web/e2e/database-table-browser.spec.ts)
  recommended (sortable header + row link).

```bash
make e2e_test_management_web_report_spec SPEC=e2e/database-table-browser.spec.ts
```

---

## E2E selector notes

- Prefer `Table.SortableHeaderCell` inner `<button>` + `aria-label` / `aria-sort` instead of raw
  `<th>` text + arrow literals.
- Flag status: target icon link **`aria-label`** instead of the word "Open".

## Verification

- `npm run lint`, `npm run build:packages`, `npm run build -w apps/management-web`.
- Run the specs listed above after each subsection lands.

## Out of scope

- Storage (phase 05).
- Workers (phase 06).
- Permissions matrix pages (stay raw `Table`; phase 07 may adopt header cells only).
