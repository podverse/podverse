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

| Kind                                        | Path                                                                                                                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Low-level controls                          | `components/primitives/` (`Button`, `Card`, `CountBadge`, `UnseenIndicator`, `CoverImage`, `MoreMenu`, `FillList`, `ListRow`, `ReorderHandle`, `ScreenHeader`, `ToggleSwitch`, `VerticalCenter`)             |
| Reorder / drag                              | `components/reorder/` (`ReorderableSections`, `ReorderableList`)                                                                                                                                             |
| Screen scaffold                             | `components/screen/` (`HeaderBar`, `HeaderBarChrome`, `HeaderBarAction`, `HeaderBarActions`, `OfflineModeBanner`, `MobileScreenContainer`, `ModalSafeArea`, `ThemedStackHeader`)                             |
| Section / list grouping                     | `components/section/` (`SectionHeading`, `SectionCard`)                                                                                                                                                      |
| Loading / empty / error / auth-gated chrome | `components/state/` (`ListLoading`, `EmptyStateText`, `ListEmpty`, `ListError`, `CallToActionSection`, `LoadingSection`, `AuthAwareLoadState`, `RetryableError`)                                             |
| Playback row actions / mini player          | `components/player/`                                                                                                                                                                                         |
| Membership / gate feedback                  | `components/feedback/` (`ConfirmDialog` via `openGate`, `HelperNote`, `GatedFeatureNotice` only when there is no action to attach)                                                                           |
| Form / settings selects                     | `components/form/` (`TextField`, `FormField`, `FormActions`, `SearchField`, `ListFilterField`, `OptionChipGroup`, `SettingsSwitchRow`, `SettingsDependentGroup`, `SettingsOptionNavRow`, `OptionListScreen`) |
| Domain controls (download, filters)         | `components/download/`, `components/subscriptions/`                                                                                                                                                          |
| Chapter list rows                           | `components/content/ChapterListRow` — full player and episode detail; images only when the section has any (**mobile-chapter-artwork**)                                                                      |
| Playlist / user catalog rows                | `components/content/PlaylistListRow`, `ProfileListRow` — text-only (no artwork); copy helpers in `lib/rows/catalogRowCopy`                                                                                   |
| Shared stateful logic                       | `hooks/`                                                                                                                                                                                                     |
| Pure helpers                                | `lib/`                                                                                                                                                                                                       |

Do **not** import `@podverse/ui` (web components / SCSS). Tokens come from `@podverse/design-tokens`
via **mobile-theme-parity**.

**Static form-style screens:** Body copy/fields stay in one tight stack. Choice chips use
`FormField` (the label names the field and does not repeat an option). `FormActions` is a column:
every action is full width, and array order is top to bottom. Page and sheet forms pass dismiss
or secondary first and confirm last, so the way out sits above the action that continues
(Reject above Accept, Cancel above Save). `ConfirmDialog` passes confirm then cancel, so a
slip toward the bottom does not commit. Text a person reads on a page, sheet, or form is
`typography.prose`. A `Text` with no size is the platform 14 and is not a reading size. A checkbox
label beside that copy is `body`, one step smaller. `caption`
and `label` stay quiet; do not use them or `body` for that page. `proseDisclosureGap` is the extra margin above a disclosure that follows prose. With the
paragraph's own bottom margin, that seam matches `formActionsTopGap`, the space above an
agreement checkbox and the action column.
`formActionsGap` is the gap between those buttons and above a destructive action under the column.
`FormActions` uses `Button` `size="form"` (`FORM_BUTTON_MIN_HEIGHT`, 52pt, 17pt semibold) so form,
dialog, checkout, and other page or section call-to-action decisions share one height. A raw
`Button` that is that decision passes `size="form"` and `fullWidth` too. Header, row, banner, and
identity-block actions stay `sm` or `md`. Do not share one
`gap` across prose and CTAs, and do not repeat the stack title as an in-body heading. The prose
column's gap is `settingsCardInnerGap`. A `Text` in that column does not add its own vertical
margin. See **even-content-spacing** and **mobile-screen-layout**.

**Text fields:** `TextField` is the only painted input (tertiary fill, focus ring — never a
stroked `TextInput`). Pass **`eyebrow` + `placeholder`** for forms (login, sign-up, playlist,
add-by-RSS), matching web `TextInput` inset eyebrow. The caption lives _inside_ the pill; do
not add a second `<Text>` label above it. The placeholder must **differ** from the eyebrow
(example, `Optional` / `Required`, default-if-blank, or a short instruction) —
**form-eyebrow-placeholder**. Eyebrow fields are taller than the compact pill.
**Omit `eyebrow` only** for directory search and on-screen list filters (`SearchField`,
`ListFilterField`). Both search and list filters add an X inside the pill while the value is
non-empty. Each field reads its own shared accessible name. Pressing the X clears the value and
keeps the keyboard up. Form fields omit it. `TextField` owns the focus target and the X, and
blurs when the host screen loses focus. Do not wrap a thin input in a padded `View`, and do
not grow `TextInput` padding to fake a larger target. Field, chips, and the list rule share one
column `gap` (`spacing.base`) so the space above and below the chips is equal. Prefer that
symmetry whenever two sides of a control are the same relationship. See **mobile-screen-layout**.

**Settings option density:** Settings root is a group list (`MenuListScreen`) that pushes
Appearance, Tab bar, Playback, and Notifications. 2–3 choices → `OptionChipGroup`; 4+ → push
option-list screen (not bottom sheet). Selected chip uses `buttonPrimary` fill. Option rows
stack label / description / current value (not trailing). See **mobile-settings-option-density**.

**Dependent settings:** A parent switch that owns child switches uses `SettingsDependentGroup`.
A thin rail lines up with the parent title; children indent past it (no fill). Prefer
`ToggleSwitch` over a raw React Native `Switch` so iOS 26 layout matches the drawn control.
`SettingsSwitchRow` is the label beside a switch, at the menu title size (19), and centers the
title ink on the switch. Card gaps, the hairline between groups, and option-list rows live in
**mobile-screen-layout**.

**Bottom chrome strips:** Offline Mode, chapter/clip, and activity-label rows above the mini
player share `bottomChromeStrip*` helpers in `theme/bottomChromeStrip.ts` (same height, size, and
weight). Colors stay per strip.

**Cover images:** `CoverImage` (`expo-image`, memory+disk cache) opens the **`ImageViewer`** root
screen on a stationary tap (full width, contained, portrait, `ROOT_SLIDE_UP_SCREEN_OPTIONS`). A
tap that drags stays a scroll — do not open the viewer from movement inside the artwork. The
viewer more control uses **`HeaderBarAction`** + **`MoreMenu`**. Download goes through
`shareRemoteFile` (OS share sheet), not the episode download manager, and is omitted when the
artwork needs request headers. Pass `addByRssFeedUrl` for an Add by RSS feed. The route never
carries an `Authorization` value. Pass `opensViewer={false}` when the parent row, cell, or
mini-player is the pressable control. First-paint preview and cache habit:
**mobile-image-loading**. Layout: **mobile-screen-layout**.

**More / overflow:** a More control opens **`MoreMenu`** — a bottom sheet that appears instantly
(no slide, no fade). The action group uses `background.tertiary` with centered bold command rows; Cancel is
a separate block with `background.quaternary` (same type size and bold weight). Do not
paint Cancel with a translucent token (`button.secondaryBg` composites into the same navy
on a dark scrim). Do not use `background.secondary` for either block (it matches dark
screen chrome). Do not use a centered `ConfirmDialog`-style card. Do not style Cancel as a
pill `Button`. Do not reuse
`OptionListGroup` for More — that component is single-choice settings. `ConfirmDialog` stays
title + body + one confirm.

**Hub menus:** `MenuListScreen` takes `sections` — a title above each `Card` (`text.accent`,
heading weight), hairlines between rows. Chevron (`›`) only on rows that push a screen. Log out
is an in-place action: `showsChevron: false`. More groups Account (Profile, Membership, renewal,
Login / Sign up or Log out), Features (overflow tabs, Settings, OPML), Other (About, Advanced).
An **E2E** section appears in local Metro and E2E builds (never in release): Smoke always in
that section; Playback (`Play E2E video`, skip-next) only when `EXPO_PUBLIC_MOBILE_E2E=1`.
Header-to-card gap is `spacing.lg`; space between groups is `spacing.xl`.

**Browse vs Home:** Browse is a global directory that reuses `MediaTypeSelector`, `HomeFeedRow`,
and `FillList`. It does **not** reuse `HomeScreen`. One chip row: media types in a stable order,
then Categories and sort (filter chrome) only when the current type can use them. The sort chip
is last. Selecting a type does not move that chip.
Tapping Categories replaces the list with categories (range chip hides); tapping a category
filters the last type (podcasts, episodes, clips) and relabels the chip. Music,
playlists, and users have no Categories chip. Tapping a type leaves the category list. No filter
field and no item count — Search covers directory lookup. Home keeps its filter (finite
subscriptions) and has no item count either. Search stays Podcast Index full-text; do not send
Browse rows there.

**List rows:** `HomeFeedRow` for media/results (a top hairline on every row, including the first;
no bottom hairline; a podcast, album, or artist row uses `LIST_ROW_SHOW_VERTICAL_INSET` (10) so
the 78×78 artwork makes a 98pt row. Every `HomeFeedRow` identity stack uses a column `gap` of
`spacing.xs`. Episode, clip, and track rows use vertical padding `spacing.lg`. Downloads and
category rows use `spacing.base`. Artwork is 78×78). Identity lines use that column `gap`, not
per-line margins, and the text stack is vertically centered. Item and channel pub dates use the
same type: 14pt, weight 700, line height 20, `tokens.text.link`. An item description is 14pt,
weight 400, line height 20, in secondary color, and it shares that `spacing.xs` gap with the
identity row. The play band stays on the wider gap below the text. Track rows
(`mediaType="tracks"`) omit the list play/pause band and put More in `identityRow`, vertically
centered with the artwork and text; the row press still starts playback. A podcast, album, or
artist row never mounts More — channel actions stay on swipe-left / grid long-press
(**mobile-screen-layout**). `ListRow` is the title/subtitle primitive. Its title-to-subtitle
gap stays `spacing.sm`, and its default vertical padding is `spacing.base`. A numeric
`badgeCount` renders `CountBadge` left of `trailing` (chevron) and hides at 0; do not invent a
second count chip. See **mobile-screen-layout**.

**Home subscription markers:** live, unseen, and downloaded each have one home. Do not reuse the
count chip for unseen presence.

- **List (`HomeFeedRow`):** a channel row's live `Badge` is centered on the artwork; downloaded
  count is the line under the title; unseen on a channel row is `UnseenIndicator` (accent
  circle, no number) in a slim full-height rail at the far right of the row, with the dot
  vertically centered on the whole row. On a channel-detail item row the same indicator sits
  at the trailing top of the title line. A livestream item row states its status in the play
  band, in the slot where an episode row shows its duration: the Live badge while on the air
  and a neutral Scheduled or Ended badge otherwise. The badge replaces the duration. Only a
  Live row has Play, with the badge beside it. A Scheduled or Ended row has no Play: the
  badge starts the band and More sits at the far end. Pressing any livestream row opens its
  livestream page. The date stays on the date line under the title, and the context line
  carries only the show name. A livestream inside an album uses this same episode row, never
  the compact track row. Channel rows keep Live on the artwork.
- **Grid (`HomeFeedGridCell`):** live top-right, unseen indicator bottom-right, downloaded
  `CountBadge` bottom-left.

**Grid long press:** a tile whose list row has a swipe action passes it as `removeAction`;
holding the tile opens `MoreMenu` with that action and Cancel, and screen readers get it as the
`remove` accessibility action. A tile with no swipe counterpart (Browse) has no long press.

**Count badges:** `CountBadge` is the circular (oval when the digits need it) count chip. Hub
rows pass `badgeCount` on `MenuListItem` / `ListRow`. Bottom tabs use React Navigation
`tabBarBadge` with the shared `tabBarBadgeStyle` (same accent circle). Hide at 0. A tab badge
is the **sum** of the in-progress row counts on that tab (`sumBadgeCounts`). Do not reuse
`Badge` (text pill) for numeric counts. Do not put a number on unseen — that is
`UnseenIndicator`.

**Action gates:** keep the gated control; on press `openGate(reason)` (`ConfirmDialog`). Do not
inline `GatedFeatureNotice` next to an untapped button. Full-screen empties still use
`CallToActionSection`. Buttons in that centered fill are full width of the column. In-page
explainers that are not the content use **`HelperNote`**. Gate
title/body/confirm keys come from **`membershipGateMessageKeys`** / confirm helpers — exhaustive
on `AccessDenialReason`, no fallback `t(...)`. See **mobile-screen-layout** and
**i18n-user-facing-strings**.

**Screen layout:** tab roots and stack screens share `HeaderBar` (44pt row, no divider under the
title) and the same page-body gutter — `screenBodyInsets` from `theme/screenLayout.ts`
(`spacing.lg` below the bar and on both sides). Header icons and header action labels use
`tokens.text.primary` via `HeaderBarAction` (same as the title — not accent/link blue). Stack
header icons use the 26pt default. The channel settings gear is 22pt and top-aligned with the
title (`CHANNEL_HEADER_SETTINGS_ICON_SIZE`). Do not
add a second inner `Card` inset on top of that gutter. Do not wrap a scrolling result list in a
perimeter `Card`. Screen lists that show a `VerticalCenter` fill empty use **`FillList`** (scroll
locked when `data` is empty and `ListEmptyComponent` is set). Login and Sign up overlay the tabs
in a full-screen slide `Modal` with `HeaderBarChrome` (`chevron-down`, no Cancel), header-band
drag dismiss, and a text + link switch under Submit. See **mobile-screen-layout**.

## Checklist before finishing a screen

- [ ] Loading / empty / error / auth-empty use `components/state/*` (not ad-hoc `ActivityIndicator` +
      hardcoded English). Pending data shows `LoadingSection` / `ListLoading` /
      `isInitialLoading` — never `ListEmpty` while the request is still out
      (**mobile-pending-content-spinner**). Login-gated fill states use
      **`CallToActionSection`** (via `AuthAwareLoadState` `showAuthRequired`, or as a `FillList`
      empty) with `authentication.login_required` and `authentication.login` — not `ListEmpty`.
      See **mobile-screen-layout** and **generic-login-required-copy**.
- [ ] Button loading uses `Button` `loading`. A spinner or other content that appears inside a
      button stays in the resting face and does not change the button's size
      (**button-stable-bounds**).
- [ ] Hub menus (More, Library) use `MenuListScreen` `sections`. Named headers sit
      above the card. Chevron only on rows that push a screen — not on Log out.
- [ ] List/media rows use `ListRow` / `HomeFeedRow` / `MediaRowActions` (or a shared row wrapper)
      when the layout matches existing screens. Do **not** add a media-type pill on those rows.
      Top hairline on every content row, including the first. No bottom hairline. A podcast,
      album, or artist `HomeFeedRow` uses `LIST_ROW_SHOW_VERTICAL_INSET`; episode, clip, and
      track rows use `spacing.lg` (Downloads and category rows use `spacing.base`). No
      standalone divider under chips or a filter.
- [ ] Cover / artwork images use `CoverImage` (square corners). Do not round podcast or episode art.
      Standalone art opens the `ImageViewer` root screen by default. Pass
      `opensViewer={false}` when the image sits inside a pressable row, cell, or header
      (the parent is the control).
- [ ] More / overflow opens `MoreMenu` (instant bottom sheet, tertiary action group,
      opaque quaternary Cancel block), not a slide, fade, centered card, or pills.
- [ ] Screen outer chrome uses `HeaderBar` / `MobileScreenContainer` / `SectionCard` when applicable.
      Body under the bar uses `screenBodyInsets` (**mobile-screen-layout**).
- [ ] Screen lists with a fill empty (`VerticalCenter` / `LoadingSection` / `CallToActionSection`)
      use `FillList`, not a raw `FlatList` with hand-toggled `scrollEnabled`.
- [ ] User-facing strings go through i18n (`t()`), including `accessibilityLabel` (**i18n-user-facing-strings**).
- [ ] New shared UI gets a stable `testID` where E2E will assert it.
- [ ] Boxed fields use `TextField` / `SearchField` / `ListFilterField` so the painted chrome
      is the hit target. Forms pass `eyebrow` + a **distinct** `placeholder`
      (**form-eyebrow-placeholder**); search and list filters omit `eyebrow` and show the X
      only while the value is non-empty. Do not wrap a
      `TextInput` in a padded `View`, and do not grow `TextInput` padding to enlarge the
      target.
- [ ] If you duplicated JSX that already exists on another screen, stop and extract.

## Avoid

- One-off `StyleSheet` clones of `ListRow` / `Card` / load-state chrome inside a single screen.
- Hardcoded hex colors — use theme tokens (`useTheme()` / design tokens).
- Waiting for a “third callsite” before extracting an obviously shared pattern.
- Porting web `@podverse/ui` or SCSS patterns into RN.

## Related

- Rule: **reuse-beyond-components** — the same habit for hooks and pure functions, including logic
  mobile shares with web through `@podverse/helpers`
- Rule: **mobile-pending-content-spinner** — spinner until load settles; never an empty flash
- Rule: **button-stable-bounds** — a button does not change size when a spinner or other content
  appears inside it
- Rule: **mobile-react-native** (boundaries + DRY bullet)
- Theme: **mobile-theme-parity**
- Web counterpart (not for mobile imports): **reusable-components**
- App entry notes: [apps/mobile/AGENTS.md](/apps/mobile/AGENTS.md)
