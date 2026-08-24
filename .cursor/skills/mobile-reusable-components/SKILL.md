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

| Kind                                        | Path                                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Low-level controls                          | `components/primitives/` (`Button`, `Card`, `ListRow`, `ScreenHeader`)                                |
| Screen scaffold                             | `components/screen/MobileScreenContainer`                                                             |
| Section / list grouping                     | `components/section/` (`SectionCard`, `ListSection`)                                                  |
| Loading / empty / error / auth-gated chrome | `components/state/` (`ListLoading`, `ListEmpty`, `ListError`, `AuthAwareLoadState`, `RetryableError`) |
| Playback row actions / mini player          | `components/player/`                                                                                  |
| Membership / gate feedback                  | `components/feedback/`                                                                                |
| Form / settings selects                     | `components/form/` (`OptionChipGroup`, `SettingsOptionNavRow`, `OptionListScreen`)                    |
| Domain controls (download, filters)         | `components/download/`, `components/subscriptions/`                                                   |
| Shared stateful logic                       | `hooks/`                                                                                              |
| Pure helpers                                | `lib/`                                                                                                |

Do **not** import `@podverse/ui` (web components / SCSS). Tokens come from `@podverse/design-tokens`
via **mobile-theme-parity**.

**Settings option density:** 2–3 choices → chips; 4+ → push option-list screen (not bottom sheet).
Root row stacks label / description / current value (not trailing). See
**mobile-settings-option-density**.

## Checklist before finishing a screen

- [ ] Loading / empty / error / auth-empty use `components/state/*` (not ad-hoc `ActivityIndicator` +
      hardcoded English).
- [ ] List/media rows use `ListRow` / `MediaRowActions` (or a shared row wrapper) when the layout
      matches existing screens.
- [ ] Screen outer chrome uses `MobileScreenContainer` / `ScreenHeader` / `SectionCard` when applicable.
- [ ] User-facing strings go through i18n (`t()`), including `accessibilityLabel` (**i18n-user-facing-strings**).
- [ ] New shared UI gets a stable `testID` where E2E will assert it.
- [ ] If you duplicated JSX that already exists on another screen, stop and extract.

## Avoid

- One-off `StyleSheet` clones of `ListRow` / `Card` / load-state chrome inside a single screen.
- Hardcoded hex colors — use theme tokens (`useTheme()` / design tokens).
- Waiting for a “third callsite” before extracting an obviously shared pattern.
- Porting web `@podverse/ui` or SCSS patterns into RN.

## Related

- Rule: **mobile-react-native** (boundaries + DRY bullet)
- Theme: **mobile-theme-parity**
- Web counterpart (not for mobile imports): **reusable-components**
- App entry notes: [apps/mobile/AGENTS.md](/apps/mobile/AGENTS.md)
