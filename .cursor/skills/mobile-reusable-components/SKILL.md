---
name: mobile-reusable-components
description: Prefer shared RN components under apps/mobile/src/components for DRY and visual consistency across mobile screens. Use when adding or editing mobile screens, list rows, loading/empty/error chrome, or screen scaffolds.
---

# Mobile reusable components (DRY)

## When to use

- Adding or changing UI in `apps/mobile/src/screens/**` or `apps/mobile/src/components/**`.
- You are about to copy JSX for loading/empty/error, list rows, section cards, or screen chrome.
- Web **`reusable-components`** / `@podverse/ui` do **not** apply here — mobile is RN-only.

## Why

Consistency and DRYness across tabs/screens matter as much as on web. Rebuilding chrome from raw
`View` / `Text` / `Pressable` in each screen drifts layout, tokens, `testID`s, and i18n.

## Prefer this order

1. **Reuse** an existing export under `apps/mobile/src/components/**` (and shared hooks under
   `apps/mobile/src/hooks/**` for load/mutate patterns).
2. **Extend** that component with a prop/`variant` when the difference is small.
3. **Extract** a new shared component (or hook) under `components/` / `hooks/` when the pattern is
   generic or already needed on a second screen — same “extract early” bar as `src/lib/` helpers
   (**mobile-react-native**).
4. Keep **screen files as orchestration** (repositories/hooks + wiring). Avoid large inline
   presentation blocks that another screen will need to copy.

## Where things live

| Kind                                        | Path                                                                                                                                           |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Low-level controls                          | `components/primitives/` (`Button`, `Card`, `CoverImage`, `FillList`, `ListRow`, `ReorderHandle`, `ScreenHeader`, `VerticalCenter`)            |
| Reorder / drag                              | `components/reorder/` (`ReorderableSections`, `ReorderableList`)                                                                               |
| Screen scaffold                             | `components/screen/` (`HeaderBar`, `MobileScreenContainer`, `ThemedStackHeader`)                                                               |
| Section / list grouping                     | `components/section/` (`SectionCard`, `ListSection`)                                                                                           |
| Loading / empty / error / auth-gated chrome | `components/state/` (`ListLoading`, `ListEmpty`, `ListError`, `CallToActionSection`, `LoadingSection`, `AuthAwareLoadState`, `RetryableError`) |
| Playback row actions / mini player          | `components/player/`                                                                                                                           |
| Membership / gate feedback                  | `components/feedback/` (`ConfirmDialog` via `openGate`, `HelperNote`, `GatedFeatureNotice` only when there is no action to attach)              |
| Form / settings selects                     | `components/form/` (`SearchField`, `OptionChipGroup`, `SettingsOptionNavRow`, `OptionListScreen`)                                               |
| Domain controls (download, filters)         | `components/download/`, `components/subscriptions/`                                                                                            |
| Shared stateful logic                       | `hooks/`                                                                                                                                       |
| Pure helpers                                | `lib/`                                                                                                                                         |

Do **not** import `@podverse/ui` (web components / SCSS). Tokens come from `@podverse/design-tokens`
via **mobile-theme-parity**.

**Search field:** use `SearchField` (tertiary fill, leading glass, focus ring). Do not clone a
stroked `TextInput`. Field, chips, and the list rule share one column `gap` (`spacing.base`) so
the space above and below the chips is equal. Prefer that symmetry whenever two sides of a
control are the same relationship.

**Settings option density:** 2–3 choices → `OptionChipGroup`; 4+ → push option-list screen (not
bottom sheet). Selected chip uses `buttonPrimary` fill. Root settings rows stack label /
description / current value (not trailing). See **mobile-settings-option-density**.

**List rows:** `HomeFeedRow` for media/results (`isLast` drops the bottom hairline; vertical
padding is `spacing.base`; artwork is 60×60). Title / subtitle / metadata use a column `gap`
(`spacing.sm`), not per-line margins, and the text stack is vertically centered. `ListSection`
passes `(item, index, isLast)`. `ListRow` is the title/subtitle primitive with the same gap and
padding. See **mobile-screen-layout**.

**Action gates:** keep the gated control; on press `openGate(reason)` (`ConfirmDialog`). Do not
inline `GatedFeatureNotice` next to an untapped button. Full-screen empties still use
`CallToActionSection`. In-page explainers that are not the content use **`HelperNote`**. See
**mobile-screen-layout**.

**Screen layout:** tab roots and stack screens share `HeaderBar` (44pt row, no divider under the
title) and the same page-body gutter — `screenBodyInsets` from `theme/screenLayout.ts`
(`spacing.lg` below the bar and on both sides). Do not add a second inner `Card` inset on top of
that gutter. Do not wrap a scrolling result list in a perimeter `Card`. Screen lists that show a
`VerticalCenter` fill empty use **`FillList`** (scroll locked when `data` is empty and
`ListEmptyComponent` is set). See **mobile-screen-layout**.

## Checklist before finishing a screen

- [ ] Loading / empty / error / auth-empty use `components/state/*` (not ad-hoc `ActivityIndicator` +
      hardcoded English). Login-gated fill states use **`CallToActionSection`** (via
      `AuthAwareLoadState` `showAuthRequired` + `authMessageKey`, or as a `FillList` empty) with
      feature-specific benefit copy and `authentication.login` — not `ListEmpty` +
      `authentication.login_required`. See **mobile-screen-layout**.
- [ ] List/media rows use `ListRow` / `HomeFeedRow` / `MediaRowActions` (or a shared row wrapper)
      when the layout matches existing screens. Do **not** add a media-type pill on those rows.
      Last row: `isLast` (no bottom hairline). Vertical padding: `spacing.base`.
- [ ] Cover / artwork images use `CoverImage` (square corners). Do not round podcast or episode art.
- [ ] Screen outer chrome uses `HeaderBar` / `MobileScreenContainer` / `SectionCard` when applicable.
      Body under the bar uses `screenBodyInsets` (**mobile-screen-layout**).
- [ ] Screen lists with a fill empty (`VerticalCenter` / `LoadingSection` / `CallToActionSection`)
      use `FillList`, not a raw `FlatList` with hand-toggled `scrollEnabled`.
- [ ] User-facing strings go through i18n (`t()`), including `accessibilityLabel` (**i18n-user-facing-strings**).
- [ ] New shared UI gets a stable `testID` where E2E will assert it.
- [ ] If you duplicated JSX that already exists on another screen, stop and extract.

## Avoid

- One-off `StyleSheet` clones of `ListRow` / `Card` / load-state chrome inside a single screen.
- Hardcoded hex colors — use theme tokens (`useTheme()` / design tokens).
- Waiting for a “third callsite” before extracting an obviously shared pattern.
- Porting web `@podverse/ui` or SCSS patterns into RN.

## Related

- Rule: **reuse-beyond-components** — the same habit for hooks and pure functions, including logic
  mobile shares with web through `@podverse/helpers`
- Rule: **mobile-react-native** (boundaries + DRY bullet)
- Theme: **mobile-theme-parity**
- Web counterpart (not for mobile imports): **reusable-components**
- App entry notes: [apps/mobile/AGENTS.md](/apps/mobile/AGENTS.md)
