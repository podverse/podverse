# 713-web-subscribed-filter-input

**Master step:** P2.5.2
**Model (author + implement):** Codex 5.3
**Status:** implemented

## Scope

Web counterpart to
[705-home-subscribed-list-and-filter](/docs/proposals/mobile/_master-plan_/phase-2/details/705-home-subscribed-list-and-filter.md).
Mobile's Home gets a `Filter…` input that narrows the subscribed list by title. `/podcasts` gets the
same affordance so the two surfaces behave alike.

### Behavior

- A `Filter…` input in the `/podcasts` header, shown for the **subscribed** list type only.
- Matches on **channel title only** — not description, author, or category.
- Matches against both the raw title and a stripped form, so punctuation and diacritics do not
  prevent an obvious match.
- Case-insensitive, substring rather than prefix.
- Filtering is **not** search. It never calls the search API; it narrows what the list already shows.

### The web-specific complication

Web paginates server-side, so a purely client-side filter would only narrow the **current page** —
which reads as broken when a user filters and gets nothing on page 3. Mobile has no such problem
because the whole subscribed list is local.

Resolve this explicitly rather than shipping a page-local filter. Preferred order:

1. Fetch the full subscribed channel list for filtering when the subscribed type is active, if the
   list size makes that reasonable, and filter client-side.
2. Otherwise pass the filter term to the subscribed endpoints as a server-side title filter and keep
   pagination authoritative.

Whichever is chosen, **filtering must apply across the whole subscribed list, never a single page**,
and pagination must reflect filtered results. State the choice and its reasoning in the
implementation.

**Chosen: option 1.** The subscribed list is read page by page into the browser the first time a term
is typed, cached until sort, range, or account changes, and bounded at `PAGINATION.MAX_COUNT`.
Filtering and pagination then happen over that list, so a match on page 3 is found from page 1 and no
keystroke costs a request. Reasoning and the ceiling's consequence are recorded in
`.llm/plans/active/mobile-p2-home-podcasts/00-DIVERGENCES.md`.

### URL state

The filter term participates in URL query state like the existing type, sort, and range controls, so
a filtered list is linkable and survives reload. Follow **routing-url-params** and
**e2e-url-state-contracts**.

### Shared copy

The placeholder and empty-state strings come from the **`consumer`** catalog, shared with mobile.

### Not in scope

- Filtering global or category browse. Those are server-paginated directory queries where search is
  the right tool.
- Changing the existing sort, range, or view controls.

## Acceptance criteria

- `/podcasts` shows a `Filter…` input for the subscribed list type only.
- Filtering narrows by title across the **entire** subscribed list, not just the current page, and
  pagination reflects filtered results.
- Matching is case-insensitive substring against raw and stripped titles.
- No search API call results from typing in the filter.
- The filter term round-trips through the URL and survives reload.
- A filtered list with no matches shows a distinct empty state from an empty subscription list.
- Strings resolve from the `consumer` catalog and are shared with mobile.
- E2E covers filtering, the no-match empty state, and URL round-trip.

- **Screen reader:** the input has a real associated label, not placeholder-only text that vanishes
  on typing; filtered result counts are announced through an `aria-live` region; the control is
  keyboard operable with a visible focus ring.

**This filter keeps its URL round-trip and is not written to the preference store.**
[715-web-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/715-web-filter-sort-persistence.md)
adds durable per-instance memory for sort and structured filters, but free text is excluded on both
surfaces for the same reason — see
[705](/docs/proposals/mobile/_master-plan_/phase-2/details/705-home-subscribed-list-and-filter.md).
The URL round-trip stays so a filtered view remains shareable.

## Web parity references

- `apps/web/src/app/podcasts/PodcastsPageHeader.tsx`, `PodcastsPageContext.tsx`,
  `PodcastsPageDropdownConfig.ts`
- `apps/web/src/hooks/useSubscribedListHeader.tsx`
- `apps/api/src/controllers/channel.ts` — `getManySubscribedAZ|Recent|Top`
- Skills: **routing-url-params**, **e2e-url-state-contracts**, **e2e-page-tests**, **i18n**

## Verification

```bash
npm run lint
npm run test:unit
npm run test:e2e:api
make e2e_test_web_report_spec SPEC=e2e/podcasts-subscribed-filter.spec.ts
```
