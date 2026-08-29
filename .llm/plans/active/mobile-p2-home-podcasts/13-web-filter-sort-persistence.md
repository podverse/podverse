# 13 — Web per-instance filter and sort persistence

**Cursor model:** Opus 5
**Reasoning:** high
**Detail:** [715-web-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/715-web-filter-sort-persistence.md)
**Master step:** P2.5.3
**Depends on:** 06 (shared key builder), 12

This is a **web** prompt. Verify with Playwright, not Maestro.

Read [00-SUMMARY.md](00-SUMMARY.md) decisions 46–50 and the
[`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc) rule before starting.

## Goal

Give `apps/web` the same behavior mobile got in prompts 06 and 12: every screen with a filter or sort
control remembers the last selection **per instance** and restores it on the next load, including a
cold load from a bookmark.

## What exists today

Two mechanisms, neither sufficient. `local-settings` cookie `fd.<page>` is durable but keyed by page
**type**, so all podcast pages share one bucket. `pv-page-state-` `sessionStorage` is per instance but
expires in 30 minutes and only restores on browser **back**. The work merges those properties.

## Work

1. Add a per-instance namespace to the existing `local-settings` cookie, keyed by the **shared builder
   from `@podverse/helpers`** that prompt 06 created. One key format across both apps — do not invent
   a web-only one, and do not adopt `@podverse/ui`'s `podverse_table_sort_prefs` here without
   reconciling it against that builder.
2. Cap it at the **30 most recently used** entries with LRU eviction. Cookies max out at 4KB and ride
   on every same-origin request, so roughly 1KB is the budget. Beyond the window, fall back to the
   screen's documented default — never a stale entry.
3. **Use the cookie, not `localStorage`.** List and detail pages fetch with a sort parameter during
   server rendering, and `localStorage` is invisible to the server; storing prefs there produces a
   default-sorted first paint that visibly reshuffles after hydration plus a duplicated request.
4. Implement resolution order: explicit URL query parameter (**and write it into the store**) →
   stored preference for this instance → documented default. Do **not** push defaults into the URL to
   make this work — [`routing-url-params`](/.cursor/rules/routing-url-params.mdc) still applies and
   clean URLs stay clean.
5. **Global list routes** — keep the existing `fd.<page>` behavior but move it onto the shared key
   builder: `/`, `/podcasts`, `/episodes`, `/clips`, `/tracks`, `/albums`, `/artists`, `/playlists`,
   `/profiles`, and the two livestream routes.
6. **Fix the home page bug found during planning.** In `apps/web/src/app/page.tsx` the Zod schema
   applies non-null defaults (`sort: 'recent'`, `medium: 'all'`) **before** the cookie merge, so
   `data.sort` is never undefined and `cookieDefaults?.sort` is unreachable — the stored home
   preference is written but never applied on SSR. Make those schema fields optional without defaults
   so the merge chain can reach the stored value.
7. **Detail routes** are the new work — per-instance sort, tab, and range on `/podcast/[channel_id]`,
   `/episode/[item_id]`, `/album/[channel_id]`, `/artist/[channel_id]`, and
   `/playlist/[playlist_id]`.
8. Leave the `pv-page-state-` `sessionStorage` cache alone. It restores scroll and loaded pages on
   back navigation, which is a different problem; do not conflate the two.
9. Add or extend E2E coverage: set a sort on one podcast, open a second, assert independence; reload
   cold and assert the server-rendered HTML already carries the remembered sort.

## Constraints

- **Device-local only.** No ORM column, no endpoint, no account-synced field.
- **Structured selections only.** The `/podcasts` filter input from prompt 11 keeps its URL round-trip
  so links stay shareable, but it is **not** written to the preference store. Page number, scroll
  position, and the `/search` query are likewise excluded.
- Strict equality, no type assertions, `import type` on separate lines.
- Do not run tests during implementation.

## Done when

Opening two different podcast pages shows two independent remembered sorts, a bookmarked cold load
renders the remembered sort in the server HTML with no visible re-sort, an explicit `?sort=` wins and
updates the store, the 31st instance evicts the least recently used, and the home page's stored sort
finally applies on SSR.
