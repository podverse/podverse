**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 73 — Management web remote stub pages

A Remote Stubs list and detail page under Feeds, on plan 72's routes. Admins can search and sort
stubs, open one, and queue Re-check Now, Re-point, or Promote to Full Parse, or delete it.

## Rows

R23, R37, R38, R39, R40, R41

## Runs after

72

## Files

apps/management-web/src/lib/routes.ts
apps/management-web/src/lib/managementPermissions.ts
apps/management-web/src/app/(management)/feeds/FeedsPageClient.tsx
apps/management-web/src/app/(management)/feeds/remote-stubs/page.tsx
apps/management-web/src/app/(management)/feeds/remote-stubs/RemoteStubsPageClient.tsx
apps/management-web/src/app/(management)/feeds/remote-stubs/[id]/page.tsx
apps/management-web/src/app/(management)/feeds/remote-stubs/[id]/RemoteStubDetailPageClient.tsx
packages/i18n-catalog/management/originals/en-US.json
packages/i18n-catalog/management/originals/es.json
packages/i18n-catalog/management/originals/fr.json
packages/i18n-catalog/management/originals/el-GR.json
tools/management-web/seed-e2e.mjs
apps/management-web/e2e/feeds-remote-stubs.spec.ts
makefiles/local/e2e-spec-order-management-web.txt
release-notes/scratchpad.md

## Routes and permissions

- `apps/management-web/src/lib/routes.ts`: add `FEEDS_REMOTE_STUBS: '/feeds/remote-stubs'` after
  `FEEDS_MERGE_REVIEW`, and `buildFeedRemoteStubPath = (id: number | string): string =>
  \`${ROUTES.FEEDS_REMOTE_STUBS}/${id}\`` next to `buildUserPath`.
- `managementPermissions.ts`: add `canCreateFeeds` and `canDeleteFeeds`, written like
  `canUpdateFeeds` (line 35) with the `create` and `delete` CRUD ops.
- Re-check Now and Re-point need `canUpdateFeeds`; Promote to Full Parse needs `canCreateFeeds`;
  Delete needs `canDeleteFeeds`. Hide a button the admin cannot use. Both pages need
  `canReadFeeds`, gated the way `feeds/merge-review/page.tsx` gates its page.

## Feeds hub card

In `FeedsPageClient.tsx`, add a third card after the merge review card: `href:
ROUTES.FEEDS_REMOTE_STUBS`, `title: t('remoteStubsCardTitle')`, `description:
t('remoteStubsCardDescription')`.

## List page — `remote-stubs/`

`page.tsx` follows `feeds/merge-review/page.tsx` (server wrapper, metadata, permission gate).
`RemoteStubsPageClient.tsx` follows `apps/management-web/src/app/(management)/users/UsersListPageClient.tsx`:
`ResourceTableWithFilter`, `useManagementTableChrome`, `managementSearchParamsObject`,
`resolveManagementTableEmptyState`, `ManagementProbeChromeGate`, server-side search, sort, and
pages passed to `listRemoteStubs` from `apps/management-web/src/lib/requests/feeds.ts`.

Columns, in order: Title (falls back to the provider feed id when null), Provider Feed ID, Medium,
Feed URL (truncated), Items (`item_stub_count`), Last Resolved (`resolved_at` with
`formatDateTimeAbbrev`), Pending (the `pending_action` label, empty when null). Sortable: Title,
Provider Feed ID, Items, Last Resolved; default sort Created descending (the API default) with no
sort params written into the URL until the admin picks one (**routing-url-params**). Row actions:
a view link with `ManagementIconButtonLink` to `buildFeedRemoteStubPath(row.id)`, and delete
through the table's `onDelete` and `deleteConfirm` props (with `chrome.deleteConfirmLabels`) the
way `UsersListPageClient.tsx` wires `deleteUser`, passed only with `canDeleteFeeds`.

Search placeholder: "Title, feed URL, GUID, or provider feed ID".

## Detail page — `remote-stubs/[id]/`

`page.tsx` reads `params.id` the way `users/[id]/page.tsx` does. `RemoteStubDetailPageClient.tsx`
loads `getRemoteStub(id)` and shows, with breadcrumbs Dashboard › Feeds › Remote Stubs › title:

- Summary: Title, Author, Provider (`index_provider`), Provider Feed ID, Feed GUID, Feed URL,
  Medium, Last Resolved, Created.
- Aliases table: Kind (Feed GUID or Feed URL), Value.
- Items table (the 50 newest, with a note when `item_stub_count` is above 50): Title, Item GUID,
  Published, Duration, Last Resolved.
- Jobs table: Action (from `job_type`), Status, Attempts (`attempts/max_attempts`), Run After,
  Last Error.
- Actions row (**form-primary-actions-row**: right-aligned, DOM order Delete, Re-point, Promote to
  Full Parse, Re-check Now):
  - **Re-check Now** calls `recheckRemoteStub(id)`; on 202, show a success notice "Re-check
    queued. Workers run it within a few minutes." and reload the detail so the Jobs table shows
    the pending row.
  - **Re-point** opens a modal (**modal-layout-contract**) with one Provider Feed ID text field
    and help text "Use when the provider merged this feed into another feed id." Submit calls
    `repointRemoteStub(id, { provider_feed_id })`; a 400 shows the API message in the modal.
  - **Promote to Full Parse** opens a confirm modal ("Adds this feed to Podverse and parses it.
    The stub is removed when the parse succeeds.") then calls `promoteRemoteStub(id)`.
  - **Delete** opens a confirm modal ("Deletes the stub, its aliases, and its item rows. The stub
    is written again the next time a feed that references it is parsed, if the provider still
    lists it.") then calls `deleteRemoteStub(id)` and navigates to `ROUTES.FEEDS_REMOTE_STUBS`
    (**management-post-save-navigation**).
- While any job is `pending` or `running`, disable the three queue buttons and show the pending
  action as a badge next to the title.
- A 404 from `getRemoteStub` (for example after a worker removed the stub) shows "This remote
  stub no longer exists." with a link back to the list, inside the same page shell.
- Handle 429 with the shared rate-limit message (**rate-limit-message**).

## Copy — management catalog

Add to all four `packages/i18n-catalog/management/originals/*.json` files (English text in
`en-US`; translate the others, no empty strings). Labels, titles, and buttons are title case
(**ui-copy-casing**); help text and notices are sentences.

- `feedsHub.remoteStubsCardTitle` "Remote Stubs", `feedsHub.remoteStubsCardDescription`
  "Feeds referenced by other feeds that Podverse shows from the index without parsing them."
- A new `feedRemoteStubs` namespace with every string the two pages use: page title "Remote
  Stubs", the column and field labels above, the four action labels "Re-check Now", "Re-point",
  "Promote to Full Parse", "Delete", the pending labels "Re-check Queued", "Re-point Queued",
  "Promote Queued", the modal titles, help texts, notices, empty state "No remote stubs.", and the
  search placeholder.

## E2E seed — `tools/management-web/seed-e2e.mjs`

Add `const REMOTE_STUB_PI_IDS = ['876543250', '876543251', '876543252'];` next to
`MERGE_REVIEW_PI_IDS` (line 35) and `async function seedRemoteStubs()` after `seedMergeReview`,
written the same way (own client, `BEGIN`/`COMMIT`, delete-then-insert so re-runs replace only
these rows):

- Delete `scheduled_job` rows whose `dedupe_key` names these stubs or provider ids, then
  `remote_channel_stub` rows with `index_provider = 'podcast_index' AND provider_feed_id =
  ANY($1)` (aliases and item stubs cascade).
- Insert three stubs titled "E2E Remote Stub Recheck", "E2E Remote Stub Promote", and "E2E Remote
  Stub Delete" (podcast medium), each with a `feed_guid` and a `feed_url` alias using
  `e2e-remote-stub-<n>` GUIDs and `https://example.com/e2e-remote-stub-<n>.xml` URLs, and two item
  stubs on the first one.
- Call `await seedRemoteStubs();` in `main()` right after `await seedMergeReview();`.

## E2E spec — `apps/management-web/e2e/feeds-remote-stubs.spec.ts` (new)

Model on `feeds-merge-review.spec.ts` (`signIn` as the seeded superadmin, `actionAndCapture`,
`capturePageLoad`; **e2e-readability**, **e2e-screenshot-verified-element**). Jobs never run in
E2E, so assertions stop at "queued".

1. The Feeds hub shows the Remote Stubs card and it opens the list.
2. The list shows the three seeded stubs; searching "Recheck" leaves one row; searching
   `876543251` leaves the promote stub.
3. Opening the recheck stub shows its two aliases and two items; Re-check Now shows the queued
   notice, a pending row in Jobs, the "Re-check Queued" badge, and disabled queue buttons.
4. On the promote stub, Promote to Full Parse → confirm shows the queued notice.
5. On the promote stub, Re-point with `0123` shows the validation message.
6. On the delete stub, Delete → confirm returns to the list and the row is gone.

Add `apps/management-web/e2e/feeds-remote-stubs.spec.ts` to
`makefiles/local/e2e-spec-order-management-web.txt` right after the `feeds-flag-status.spec.ts`
line (**e2e-report-order**).

## Tests

- The E2E spec above.
- No unit tests: the pages are table and form wiring over plan 72's tested routes.

## Release scratchpad

```markdown
## Remote Stubs pages in management

- Surfaces: management-web
- Change: Feeds › Remote Stubs lists remote stubs (search, sort, item counts, last resolved, any
  queued action). A stub's page shows its lookup keys, items, and recent jobs, with Re-check Now,
  Re-point (to a provider feed id), Promote to Full Parse, and Delete. Actions are queued for
  workers and show as pending until they run.
- Who notices: admins with feeds permissions (delete and promote need delete and create)
- Operator steps: none
```
