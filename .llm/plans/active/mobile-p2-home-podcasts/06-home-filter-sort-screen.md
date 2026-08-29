# 06 — Home filter/sort screen

**Cursor model:** Codex 5.3
**Reasoning:** medium
**Detail:** [706-home-filter-sort-screen](/docs/proposals/mobile/_master-plan_/phase-2/details/706-home-filter-sort-screen.md)
**Master step:** P2.1.3
**Depends on:** 05

Read [00-SUMMARY.md](00-SUMMARY.md) decisions 11–12, 14 before starting.

## Goal

An explicit sort control on the Home list header opening a full-screen filter and sort screen, in the
previous generation's layout.

## Work

1. Add a header pill to the Home list showing the active sort (for example `A-Z`) that opens the
   screen. Give it a `testID`.
2. Register the screen on the **Home stack** in `apps/mobile/src/navigation/` —
   [`mobile-tab-stack-isolation`](/.cursor/rules/mobile-tab-stack-isolation.mdc) applies, so no
   cross-tab navigation.
3. Build it full-screen with a **Done** action that dismisses, and two sections:
   - **Filter** — the subscription scope options already on Home.
   - **Sort** — **A-Z** and **recent**.
   Put a checkmark on the active option in each section.
4. Selecting an option applies immediately to the list underneath; Done only dismisses.
5. Implement `recent` as the channel's **latest item publish date**, descending. `A-Z` uses the
   existing article-stripped comparison in `subscriptionsMerge.ts`.
6. **Establish the persistence contract here** — this screen is its first consumer, per
   [714-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/714-filter-sort-persistence.md)
   and the [`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc) rule. Build both
   halves:
   - **Shared, in `@podverse/helpers`:** the scope key builder (`podcasts`, `channel:<id_text>`,
     `item:<id_text>`, `playlist:<id_text>`) and the stored value shape. Web imports the same builder
     in prompt 13, so do not make it mobile-specific.
   - **Mobile, in `apps/mobile/src/prefs/`:** a `sortPrefs` module backed by AsyncStorage using those
     keys, unbounded. Restore **before** the first data read so the list fetches already sorted rather
     than re-sorting after paint.
   Persist the Home sort through this module. Filter scope keeps following the chip behavior from
   prompt 05, migrated onto the same module without changing current values. Prompt 12 extends it to
   the detail screens; do not try to cover them here.
7. Do **not** add the legacy directory filters (All, Category) or the top past day/week/month/year/
   all-time sorts. Home is subscribed-only.
8. Follow the option-list presentation from
   [`mobile-settings-option-density`](/.cursor/rules/mobile-settings-option-density.mdc) — not a
   bottom sheet. Reuse the pattern in `MoreSettingsThemeScreen.tsx`.
9. Extend `apps/mobile/e2e/home.yaml` to open the screen, switch sort, and assert list order changed.

## Constraints

- Reproduce the previous generation's **layout**, never its colors. Tokens from
  `@podverse/design-tokens` only — see **mobile-theme-parity**.
- All labels through i18n; reuse the existing `filters.sort.*` namespace where the keys fit.
- **Screen reader** per [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc):
  each option row needs `accessibilityRole` and `accessibilityState.selected` so the checkmark is not
  the only way to know what is active. Give the screen a heading and make sure Done is reachable and
  labeled.
- Do not run tests during implementation.

- Preferences are **device-local**. No column, endpoint, or account-synced field for sort or filter.
- The free-text filter from prompt 05 is **not** persisted and keeps clearing on restart.

## Done when

The pill opens a full-screen Filter/Sort screen with checkmarks and Done, selections apply live,
`recent` and `A-Z` order correctly, and the sort choice survives a restart — stored through the
shared scope-keyed contract, not a one-off preference key.
