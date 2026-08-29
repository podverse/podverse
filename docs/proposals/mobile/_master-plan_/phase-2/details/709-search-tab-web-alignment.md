# 709-search-tab-web-alignment

**Master step:** P2.1.3
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

The Search tab stays as the app's discovery surface and aligns with `apps/web` `/search`.

Web's search is a single debounced text field querying Podcast Index through
`reqPodcastIndexSearchPodcasts`, with **no** mode toggles, **no** sort, and **no** pagination.
Mobile added two chip rows web does not have: medium (`all | music`) and sort
(`relevance | recent | a_z`).

Because results come from Podcast Index, mobile can only filter and sort on what that API returns —
which is why the extra chips are not worth maintaining as a divergence. **Both chip rows are gone**
so mobile matches web, along with the client-side `sortFeeds()` they drove and the `medium`
parameter they set on the query. Web omits `medium` entirely and the request helper drops it when it
is absent or `all`, so the two surfaces now send the same request.

Kept as-is:

- Debounced single-field query against Podcast Index (450ms on mobile against web's 1000ms — a
  phone keyboard is slower to type on and the field is the whole screen).
- Row press resolving via `reqChannelGetByPodcastIndexId`, navigating to the channel detail on the
  **Search stack** when parsed-ready.
- The unparsed-feed preview and add flow, still gated at membership tier because adding triggers
  server-side parsing.

Also in scope: Home's empty state links here (see
[705-home-subscribed-list-and-filter](/docs/proposals/mobile/_master-plan_/phase-2/details/705-home-subscribed-list-and-filter.md)),
so the Search tab must handle being opened programmatically with an empty query.

### Arriving from Home

`SearchRoot` takes an optional `autoFocus` param. Home's empty-state button navigates to the Search
tab **and** that route with it set, which pops the Search stack back to its root; the screen then
clears the query and focuses the field. The request is consumed on arrival, so returning from a
result does not wipe what the user just searched for.

The param exists because the two ways of reaching Search want opposite things. Tapping the Search
tab should return the user to what they were doing. Pressing "Search" from a Home screen that has
nothing on it should not — that user has no history worth preserving and needs a keyboard.

## Acceptance criteria

- The medium and sort chip rows are gone from the Search screen.
- Search behavior otherwise matches web: one debounced field, Podcast Index results, no client sort.
- Row press still resolves parsed-ready channels to detail screens on the Search stack, and unparsed
  feeds to the preview/add flow.
- The add flow presents the membership affordance for anonymous and account-tier users.
- Navigating to Search from Home's empty state lands on the Search root with a focused, empty field.
- Removed i18n keys are cleaned up if unused elsewhere; no orphaned `testID`s remain in E2E flows.
- E2E `search` and `search-unparsed` flows are updated for the removed chips and still pass.

- **Screen reader:** the search field keeps a real label after the chip rows are removed, and result
  count changes are announced rather than silently replacing the list.

### Notes from implementation

- **No i18n keys became unused.** All four the chips referenced are live elsewhere:
  `filters.sort.a_z` and `filters.sort.recent` in Home's sort row and filter/sort screen,
  `filters.type.all` and `media.music.music` in web's home dropdown and side bar. Nothing was
  removed from the catalog.
- **No E2E flow referenced the chip `testID`s**, so removing them orphaned nothing. `search.yaml`
  now asserts their absence instead, which is the part worth holding: the single-field layout is the
  parity contract, and a chip creeping back in is the regression.
- **The field's label is programmatic, not just visual.** The visible label above the input stays,
  so the field is still named once typing hides the placeholder, but it is marked decorative — the
  `accessibilityLabel` on the field itself carries the name, and without that the label would be
  announced twice.
- **Counts are announced, not displayed.** Web shows no result count and mobile does not add one;
  the announcement fires on the settled count changing, skipping the first one so arriving on the
  tab does not talk over the screen title. Same shape as Home's filter announcement.

## Web parity references

- `apps/web/src/app/search/` — `SearchPageClient`, `SearchPageContext`, `SearchPageListHeader`
- `packages/helpers-requests` — `reqPodcastIndexSearchPodcasts`, `reqChannelGetByPodcastIndexId`
- `apps/mobile/src/screens/search/SearchScreen.tsx`, `PodcastIndexFeedPreviewScreen.tsx`
- `apps/mobile/e2e/search.yaml`, `apps/mobile/e2e/search-unparsed.yaml`

## Verification

```bash
npm run lint
npm run mobile:e2e:test -- search
npm run mobile:e2e:test -- search-unparsed
npm run mobile:e2e:test -- subscriptions-anonymous
```
