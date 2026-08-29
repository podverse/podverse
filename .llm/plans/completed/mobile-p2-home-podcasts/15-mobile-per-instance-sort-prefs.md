# 15 — Mobile per-instance sort preferences

**Cursor model:** Opus 5
**Reasoning:** high
**Detail:** [714-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/714-filter-sort-persistence.md)
**Master step:** P2.4.6
**Depends on:** 09

Read [00-SUMMARY.md](00-SUMMARY.md) decisions 46–50 and the
[`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc) rule before starting.

## Goal

Extend the sort-preference contract that prompt 09 established on Home to the rest of the mobile app,
so every screen with a filter or sort control remembers the last selection **per instance** and
restores it on the next load.

Prompt 09 built the shared key builder in `@podverse/helpers` and the AsyncStorage-backed
`sortPrefs` module in `apps/mobile/src/prefs/`. Reuse both. Do not create a parallel scheme.

It also left three pieces worth reusing rather than rebuilding: `OptionListGroup` (a bordered group
of checkmarked option rows, with a heading when a screen holds more than one), `HomeSortRow` as the
entry-point pattern, and `HomeFilterSortScreen` as the sectioned-screen-with-Done pattern. Where a
detail screen needs the same thing, promote rather than copy — see
[`mobile-reusable-components`](/.cursor/skills/mobile-reusable-components/SKILL.md).

## Work

1. **Podcast detail** — `PodcastDetailScreen` currently hardcodes `sort: 'recent'` with no control at
   all. Add a sort control matching the Home pill pattern from prompt 09, and persist the selection
   under `channel:<id_text>` so two different podcasts hold two different sorts. Also persist the
   episode/clips tab selection under the same scope.
2. **Episode detail** — `EpisodeDetailScreen` hardcodes sort for its related lists. Persist its tab
   selection under `item:<id_text>`. Add a sort control only where the screen actually offers more
   than one meaningful order; if it does not, say so in your summary rather than inventing one.
3. **Album detail** — `AlbumDetailScreen` hardcodes `sort: 'forward'`. Add forward/backward and
   persist under `channel:<id_text>`.
4. **Library** — move the already-persisted `library.subscriptionFilter` onto the shared module,
   preserving the current value so no user loses their setting on upgrade.
5. Restore each screen's preference **before** its first data read, so the fetch already carries the
   remembered sort. A screen that fetches a default and then re-sorts is a defect, not an
   implementation detail.
6. Extend the relevant Maestro flows: set a sort on one podcast, open a second podcast, assert the
   second shows its own default rather than the first's sort, then return to the first and assert its
   sort survived.

## Constraints

- **Device-local only.** No ORM column, no endpoint, no account-synced field. A phone and a laptop
  may legitimately disagree about sort order.
- **Structured selections only** — sort, type, range, media type, tab. Never free text, page number,
  or scroll position.
- New sort controls are new UI, so they ship **screen reader accessible** per
  [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc): accessible name,
  role, and `accessibilityState.selected` on the active option.
- All labels through i18n; reuse the `filters.sort.*` namespace where the keys fit.
- Reuse the option-list presentation from
  [`mobile-settings-option-density`](/.cursor/rules/mobile-settings-option-density.mdc) rather than a
  bottom sheet.
- Search is out of scope — prompt 12 removes its sort chips to match web.
- Do not run tests during implementation.

## Done when

Every mobile screen with a sort or filter control restores its last selection on load, two instances
of the same screen type hold independent selections, the selections survive an app restart, and
nothing about them appears in an API request.
