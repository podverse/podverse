# 09 — Search tab web alignment

**Cursor model:** Codex 5.3
**Reasoning:** medium
**Detail:** [709-search-tab-web-alignment](/docs/proposals/mobile/_master-plan_/phase-2/details/709-search-tab-web-alignment.md)
**Master step:** P2.1.3
**Depends on:** 01
**May run parallel with:** 06–09

Read [00-SUMMARY.md](00-SUMMARY.md) decisions 1, 34 before starting.

## Goal

Mobile's Search tab matches `apps/web` `/search`: one debounced field against Podcast Index, with no
mode toggles and no client sort.

## Work

1. Remove the medium chip row (`all | music`) and the sort chip row
   (`relevance | recent | a_z`) from `apps/mobile/src/screens/search/SearchScreen.tsx`, along with
   the client-side `sortFeeds()` path they drove.
2. Keep everything else: the debounced single field, the Podcast Index query via
   `reqPodcastIndexSearchPodcasts`, row press resolving through `reqChannelGetByPodcastIndexId`, and
   navigation to channel detail **on the Search stack** when parsed-ready.
3. Keep the unparsed-feed preview and add flow in `PodcastIndexFeedPreviewScreen.tsx`, gated at
   **membership** tier through the seam from prompt 01, since adding triggers server-side parsing.
4. Handle being opened programmatically from Home's empty state (prompt 05): land on the Search root
   with a focused, empty field.
5. Clean up i18n keys that become unused, and remove orphaned `testID`s.
6. Update `apps/mobile/e2e/search.yaml` and `apps/mobile/e2e/search-unparsed.yaml` for the removed
   chips.

## Constraints

- Do not change the search backend. Results come from Podcast Index, so what can be filtered or
  sorted is limited to what that API returns — which is the reason the chips are going.
- Do not reintroduce a Podverse-directory search path on this screen.
- Do not run tests during implementation.

## Done when

The chip rows are gone, search behaves like web, the add flow shows the membership affordance for
anonymous and account users, and both search E2E flows are updated.
