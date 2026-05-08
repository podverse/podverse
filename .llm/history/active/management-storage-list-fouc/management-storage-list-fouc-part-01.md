# management-storage-list-fouc

**Started:** 2026-05-07  
**Author:** Agent  
**Context:** Avoid horizontal layout jump on management-web object storage list initial load.

---

### Session 1 - 2026-05-07

#### Prompt (Developer)

when the mgmt web object storage page loads, the content on the page is first shrunken horizontally and then it expands to full size. this should NOT jump that is a FOUC we want to avoid

#### Key Decisions

- Initial load used only `LoadingSpinner` while `useCursorPagination` fetched the first page; the spinner has intrinsic icon width, so the main column appeared narrow until the full-width `Table` rendered.
- Wrapped the initial-loading branch in a full-width flex region (`width: 100%`, centered spinner, `min-height` + vertical padding) via `StoragePageClient.module.scss` so horizontal footprint matches the table phase.

#### Files Created/Modified

- `apps/management-web/src/app/(management)/storage/StoragePageClient.tsx`
- `apps/management-web/src/app/(management)/storage/StoragePageClient.module.scss`
- `.llm/history/active/management-storage-list-fouc/management-storage-list-fouc-part-01.md`

---

### Session 2 - 2026-05-07

#### Prompt (Developer)

instead of a text based More button management web should use the style of more button with horizontal ellipsis just import it from podverse-ui and adapt to it

#### Key Decisions

- Replaced `DropdownMenu` with text `triggerLabel` on object storage toolbar with `MoreButton` from `@podverse/ui` (ellipsis trigger + panel items).
- Mapped **Delete all** to `moreButtonMenuItems` with `variant: 'danger'`; kept `ariaLabel={t('moreAria')}`.

#### Files Created/Modified

- `apps/management-web/src/app/(management)/storage/StoragePageClient.tsx`
- `.llm/history/active/management-storage-list-fouc/management-storage-list-fouc-part-01.md`
