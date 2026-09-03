# 706-home-filter-sort-screen

**Master step:** P2.1.3
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Replace the implicit sort on Home with an explicit control that opens a **full-screen** filter and
sort screen, matching the previous-generation layout.

### Entry point

A pill in its own row below the media-type chips shows the active sort (for example `A-Z`) and opens
the screen. It appears on **Podcasts** and **Episodes** only; the other media types read the global
directory and have no local ordering to offer, so the row is hidden there rather than inert. See
[720-defer-home-media-type-sort-coverage](/docs/proposals/mobile/_master-plan_/phase-2/details/720-defer-home-media-type-sort-coverage.md).

### The screen

Full-screen, titled for the surface, with a **Done** action that dismisses it. Two sections:

| Section    | Options                                        |
| ---------- | ---------------------------------------------- |
| **Filter** | The subscription scope options already on Home |
| **Sort**   | **A-Z** and **recent**                         |

The active option in each section carries a checkmark. Selecting an option applies it immediately to
the list underneath; Done simply dismisses.

`recent` sorts by the channel's **latest item publish date**, descending, with channels that have
nothing stored yet ordered last so a brand new follow does not claim the top of the list on the
strength of having no information. `A-Z` uses the existing article-stripped comparison.

Directory channels take that date from the locally stored items; add-by-RSS feeds take it from
`latest_item_pub_date_ms`, written on the feed row when a parse lands, so the list read stays a
column comparison rather than a parse of every followed bundle.

On the Episodes list, sort orders the recency window rather than re-selecting from the whole store:
which episodes appear is always the newest across subscribed channels, and `A-Z` reorders those.

Home is subscribed-only, so the legacy directory filters (All, Category) and their top-past-day /
week / month / year / all-time sorts are **not** reproduced. That browsing lives in the Search tab.

### Layout, not color

Reproduce the previous-generation layout and information hierarchy. Colors come from
`@podverse/design-tokens` through the active theme — never sampled from a legacy screenshot. See
[`mobile-theme-parity`](/.cursor/skills/mobile-theme-parity/SKILL.md).

## Acceptance criteria

- The header pill shows the active sort and opens the full-screen filter/sort screen.
- The screen has Filter and Sort sections, a checkmark on each active option, and a Done action.
- Selecting an option applies immediately to the list behind the screen.
- `A-Z` and `recent` both produce correct order, with `recent` driven by latest item publish date.
- Sort choice persists across app restarts; filter scope follows the existing chip behavior.
- The screen is pushed on the Home stack and does not cross tabs
  (see [`mobile-tab-stack-isolation`](/.cursor/rules/mobile-tab-stack-isolation.mdc)).
- Options use 4+ item list presentation per
  [`mobile-settings-option-density`](/.cursor/rules/mobile-settings-option-density.mdc), not a
  bottom sheet.
- All labels resolve through i18n; no hardcoded strings and no hardcoded hex.
- E2E covers opening the screen, switching sort, and the choice surviving a re-open. Asserting row
  order needs a flow that creates two subscriptions with known titles, which no mobile flow does
  yet; the comparators are covered by unit tests instead.

- **Screen reader:** each option row exposes role and selected state, so the checkmark is not the
  only signal; the screen has a heading and Done is reachable and labeled.

**This screen builds the sort-preference contract**, since it is its first consumer — the shared
scope key builder in `@podverse/helpers` plus the AsyncStorage-backed module in
`apps/mobile/src/prefs/`. See
[714-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/714-filter-sort-persistence.md).
Do not introduce a one-off preference key here; 714 extends this same store to the detail screens and
715 implements the web half against the same builder.

## Web parity references

- Legacy layout reference: `podverse-rn` `src/screens/FilterScreen.tsx`
- `apps/web` `/podcasts` header dropdowns (`filters.sort.*`, `filters.type.*` i18n namespaces)
- `apps/mobile/src/screens/more/MoreSettingsThemeScreen.tsx` — existing option-list screen pattern
- `apps/mobile/src/data/repositories/subscriptionsMerge.ts` — sort implementations

## Verification

```bash
npm run lint
npm run test:unit
npm run mobile:e2e:test -- home
```
