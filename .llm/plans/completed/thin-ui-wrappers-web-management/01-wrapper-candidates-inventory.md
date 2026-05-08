# 01 — Wrapper candidates (inventory)

Sweep date: 2026-05-07  
Apps: `apps/web`, `apps/management-web`.

**Rule used:** flag a wrapper only when **two or more** call sites use the **same component with the same literal props pattern** (including `useTranslations` hook namespace + key). Namespace-specific strings (`t('loading')` vs `tc('loading')`) are **different** candidates.

---

## A — Management-web: `LoadingSpinner` + `common.loading`

### A1. Inline list/table loading (`size="small"` + `tc('loading')`)

Repeated pattern:

```tsx
{loading && <LoadingSpinner ariaLabel={tc('loading')} size="small" />}
```

**Occurrences (6 call sites; two are dashboard / `(management)` mirror):**

| File |
| --- |
| `src/app/(management)/users/UsersListPageClient.tsx` |
| `src/app/(management)/admins/AdminsListPageClient.tsx` |
| `src/app/(management)/stats/StatsPageClient.tsx` |
| `src/app/(management)/products/memberships/ProductMembershipsPageClient.tsx` |
| `src/app/(management)/database/[table]/TableBrowserPageClient.tsx` |
| `src/app/dashboard/database/[table]/TableBrowserPageClient.tsx` |
| _(same line logic duplicated between dashboard vs `(management)` mirrors)_ |

**Suggested wrapper:** e.g. `components/LoadingSpinner/ManagementLoadingSpinnerSmall.tsx` exporting something like `ManagementLoadingSpinnerSmall` that calls `useTranslations('common')` and renders `<LoadingSpinner ariaLabel={tc('loading')} size="small" />`.

---

### A2. Full-page / block loading (default size + `tc('loading')`)

Repeated pattern:

```tsx
<LoadingSpinner ariaLabel={tc('loading')} />
```

or early return:

```tsx
if (loading) return <LoadingSpinner ariaLabel={tc('loading')} />;
```

**Occurrences (≥5):**

| File | Notes |
| --- | --- |
| `src/app/page.tsx` | Root splash |
| `src/app/(management)/users/[id]/UserDetailPageClient.tsx` | Early return |
| `src/app/(management)/users/[id]/edit/EditUserPageClient.tsx` | Early return |
| `src/app/(management)/users/new/NewUserPageClient.tsx` | Embedded |
| `src/app/(management)/feed-operations/flag-status/FlagStatusPageClient.tsx` | Embedded |

**Suggested wrapper:** e.g. `ManagementLoadingSpinnerFull` (name TBD) — default size, `common.loading` aria.

---

### A3. Namespace-specific loading labels (not `tc('loading')`)

These repeat **within their own key** but are **not** identical to A1/A2 (different `ariaLabel` source):

| Pattern | Example files |
| --- | --- |
| `ariaLabel={t('loading')}` | `storage/StoragePageClient.tsx`, `storage/[key]/StorageObjectDetailPageClient.tsx` — uses **`storage`** namespace |
| `ariaLabel={t('loadingTables')}` | `database/DatabaseIndexPageClient.tsx` |
| `ariaLabel={t('loadingCommands')}` | `workers/WorkersPageClient.tsx` |
| `ariaLabel={ts('loadingDetail')}` | `stats/StatsPageClient.tsx` (detail pane) |

**Suggestion:** separate thin wrappers per namespace **only if** each pattern reaches 2+ identical sites; otherwise leave inline.

---

### A4. Decorative inline spinners (storage delete-all flow)

Repeated **twice** in the same file:

```tsx
<LoadingSpinner decorative size="inline" />
```

**File:** `src/app/(management)/storage/StoragePageClient.tsx` (adjacent to delete-all countdown / progress copy).

**Suggested wrapper:** e.g. `ManagementLoadingSpinnerInlineDecorative` — zero verbal duplication, purely cosmetic row prefix.

---

## B — Web: `LoadingSpinner` decorative sizes

Web already centralizes **overlay** loading via `components/LoadingSpinner/WebLoadingSpinnerOverlay.tsx`. Remaining duplicates:

### B1. Decorative `size="small"` (2 files)

```tsx
<LoadingSpinner decorative size="small" />
```

| File |
| --- |
| `src/components/Boost/messages/BoostMessagesSection.tsx` |
| `src/components/Boost/BoostRecipientStatusList.tsx` |

**Suggested wrapper:** e.g. `components/LoadingSpinner/WebLoadingSpinnerDecorativeSmall.tsx`.

---

### B2. Decorative `size="medium"` (2 files)

```tsx
<LoadingSpinner decorative size="medium" />
```

| File |
| --- |
| `src/app/verify-email/VerifyEmailPageClient.tsx` |
| `src/app/email-change-verifying/EmailChangeVerifyingPageClient.tsx` |

**Suggested wrapper:** e.g. `WebLoadingSpinnerDecorativeMedium.tsx` (same folder as other web spinner helpers).

---

## C — Management-web: error alert strip

Repeated pattern (many files):

```tsx
{error && <Alert>{error}</Alert>}
```

**≥11 occurrences** across list/detail/edit/create flows (users, admins, database browser, row detail, etc.). Some call sites use `<Alert variant="error">` instead (`src/app/page.tsx`) — normalize variant in the wrapper or accept a prop.

**Suggested wrapper:** e.g. `components/Alert/ManagementInlineErrorAlert.tsx` with props `{ message: string | null }` or children-only, mapping `null` to no render.

---

## D — Dashboard vs `(management)` duplicate routes

`src/app/dashboard/database/[table]/TableBrowserPageClient.tsx` and  
`src/app/(management)/database/[table]/TableBrowserPageClient.tsx` carry **the same** LoadingSpinner + Alert patterns. Any extraction should consider **one shared module** imported by both to avoid fixing twice.

---

## Execution order (when implementing)

1. Add management **`ManagementLoadingSpinnerSmall`** + **`ManagementLoadingSpinnerFull`** (or combined component with `variant` / `layout` prop).
2. Add web **`WebLoadingSpinnerDecorativeSmall`** + **`WebLoadingSpinnerDecorativeMedium`** next to existing `WebLoadingSpinnerOverlay`.
3. Replace Storage duplicate inline decorative spinners.
4. Optionally **`ManagementInlineErrorAlert`** after spinner passes (high touch count).
5. Re-run lint + targeted management-web E2E (`make e2e_test_management_web_report_spec SPEC=...`).

---

## Verification

- `npm run lint`
- `npm run build -w apps/web` / `apps/management-web`
- Spot-check pages that only changed imports (users list, admins list, stats, storage).
