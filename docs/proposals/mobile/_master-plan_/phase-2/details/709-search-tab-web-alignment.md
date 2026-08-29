# 709-search-tab-web-alignment

**Master step:** P2.1.3
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

The Search tab stays as the app's discovery surface and aligns with `apps/web` `/search`.

Web's search is a single debounced text field querying Podcast Index through
`reqPodcastIndexSearchPodcasts`, with **no** mode toggles, **no** sort, and **no** pagination.
Mobile currently adds two chip rows web does not have: medium (`all | music`) and sort
(`relevance | recent | a_z`).

Because results come from Podcast Index, mobile can only filter and sort on what that API returns —
which is why the extra chips are not worth maintaining as a divergence. **Remove both chip rows** so
mobile matches web.

Kept as-is:

- Debounced single-field query against Podcast Index.
- Row press resolving via `reqChannelGetByPodcastIndexId`, navigating to the channel detail on the
  **Search stack** when parsed-ready.
- The unparsed-feed preview and add flow, still gated at membership tier because adding triggers
  server-side parsing.

Also in scope: Home's empty state links here (see
[705-home-subscribed-list-and-filter](/docs/proposals/mobile/_master-plan_/phase-2/details/705-home-subscribed-list-and-filter.md)),
so the Search tab must handle being opened programmatically with an empty query.

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

## Web parity references

- `apps/web/src/app/search/` — `SearchPageClient`, `SearchPageContext`, `SearchPageListHeader`
- `packages/helpers-requests` — `reqPodcastIndexSearchPodcasts`, `reqChannelGetByPodcastIndexId`
- `apps/mobile/src/screens/search/SearchScreen.tsx`, `PodcastIndexFeedPreviewScreen.tsx`
- `apps/mobile/e2e/search.yaml`, `apps/mobile/e2e/search-unparsed.yaml`

## Verification

```bash
npm run lint
npm run test:unit
npm run mobile:e2e:test -- search
```
