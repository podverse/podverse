# Management-web SCSS elimination

**Started:** 2026-05-05  
**Author:** Cursor agent  
**Context:** Finish migrating management-web off route `page.module.scss` and global `.container` / `.page-header` layout classes; compose `@podverse/ui` shells and shared layout.

---

### Session 1 - 2026-05-05

#### Prompt (Developer)

implement the plan fully

#### Key Decisions

- Migrated remaining clients to `ManagementPageShell` and shared UI primitives (`FormGroup`, `Label`, `Input`, `Select`, `FormHintText`, `LeadParagraph`, `Table`, `CodeText`, `LookupFieldGrid`, `PageSection`, `FormContinuationSection`, `ConfirmPanel`, etc.).
- Removed global layout utilities from `apps/management-web/src/styles/index.scss` (`.container`, `.page-header`, `.page-title`, `.page-subtitle`); layout is owned by `@podverse/ui` shells.
- Deleted orphaned `page.module.scss` files under management routes once imports were gone.
- Fixed `StatsPageClient` detail `Card`: `Card` does not accept `style`; wrapped in a `div` with top margin instead.
- Flag status confirm dialog: `ConfirmPanelActions` uses Cancel (secondary) before Confirm (primary) in DOM order per form footer convention.

#### Files Created/Modified

- `apps/management-web/src/app/dashboard/DashboardPageClient.tsx`
- `apps/management-web/src/app/(management)/dashboard/DashboardPageClient.tsx`
- `apps/management-web/src/app/(management)/settings/SettingsPageClient.tsx`
- `apps/management-web/src/app/(management)/products/ProductsPageClient.tsx`
- `apps/management-web/src/app/(management)/products/memberships/ProductMembershipsPageClient.tsx`
- `apps/management-web/src/app/(management)/admins/AdminsListPageClient.tsx`
- `apps/management-web/src/app/(management)/admins/new/NewAdminPageClient.tsx`
- `apps/management-web/src/app/(management)/admins/[id]/edit/EditAdminPageClient.tsx`
- `apps/management-web/src/app/(management)/workers/WorkersPageClient.tsx`
- `apps/management-web/src/app/(management)/feed-operations/flag-status/FlagStatusPageClient.tsx`
- `apps/management-web/src/app/(management)/users/new/NewUserPageClient.tsx`
- `apps/management-web/src/app/(management)/stats/StatsPageClient.tsx`
- `apps/management-web/src/styles/index.scss`
- Deleted: `apps/management-web/src/app/(management)/settings/page.module.scss`
- Deleted: `apps/management-web/src/app/(management)/users/[id]/edit/page.module.scss`
- Deleted: `apps/management-web/src/app/(management)/users/page.module.scss`
- Deleted: `apps/management-web/src/app/(management)/workers/page.module.scss`
- Deleted: `apps/management-web/src/app/(management)/users/new/page.module.scss`
- Deleted: `apps/management-web/src/app/(management)/stats/page.module.scss`
- Deleted: `apps/management-web/src/app/(management)/users/[id]/page.module.scss`
- Deleted: `apps/management-web/src/app/(management)/feed-operations/flag-status/page.module.scss`

(Eslint/prettier may have touched additional files under `apps/management-web/src` during autofix.)
