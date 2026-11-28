**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

## Rows

R4, R6, R9, R10, R11, R33, R34, R36

Return adds the typed name. The screen's Save commits text still in the box. There is no create row. Blur does not add a chip (R33). At `maxCount` the box hides and `limitMessage` names that count. Typing stops at `maxLength`, with no sentence for that cap (R34). A non-empty `errorMessage` does not block Return or Save (R36).

## Runs after

none

## Files

- apps/mobile/src/components/form/playlistTagDraft.ts
- apps/mobile/src/components/form/playlistTagDraft.test.ts
- apps/mobile/src/components/form/PlaylistTagField.tsx
- apps/mobile/src/components/form/TextField.tsx
- apps/mobile/src/components/form/index.ts

## Tests

Unit tests in `apps/mobile/src/components/form/playlistTagDraft.test.ts` for `commitPlaylistTagDraft` and `playlistTagSearchQuery`. Mobile has no React Native component test renderer, so the component is not mounted in Vitest. No Maestro flow: this plan does not put the control on a screen. Area E owns the form wiring and the device flow. No Playwright spec and no API integration test. No catalog keys.

Cases for `commitPlaylistTagDraft`:

- A trimmed draft is appended, and the chip text is that trimmed string, not the lowercased comparison key.
- Spaces inside the name stay (`adam curry`).
- A whitespace-only draft returns `empty` and the same `tags` array.
- A case-insensitive match (`Jazz` against `jazz`, and the reverse) returns `duplicate` and the same `tags` array.
- An exact match returns `duplicate` and the same `tags` array.
- `maxCount` equal to the current length returns `at-max` and the same `tags` array.
- An omitted `maxCount` still appends.
- A trimmed draft longer than `maxLength` returns `too-long` and the same `tags` array.
- A trimmed draft the same length as `maxLength` appends.
- An omitted `maxLength` still appends a long draft.
- `added` returns a new array. Every other status returns the same `tags` reference.

Cases for `playlistTagSearchQuery`:

- `''` and whitespace return `null`.
- A draft with surrounding spaces returns the trimmed string.

## Release scratchpad

none

The control is not mounted on a screen in this plan, so nothing a person can open has changed. Area E writes the scratchpad entry when create and edit gain tags. Area I writes one only if it shows tags on the playlist detail screen.

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue.

## What this plan is

The phone's tag control. It shows the tags already on the playlist, lets the person type, asks the screen to search, and lets them pick a match or keep a typed name on the form. It does not call the API, does not import `@podverse/ui`, and does not read or write a playlist.

Area A owns storage, the case-insensitive name search, and the create/update body. Area E mounts this control on `PlaylistFormScreen` and passes the search callback. Area I may mount it read-only on the playlist detail screen. This plan does not edit those screens, `PlaylistListRow`, `packages/ui`, the catalog, or area A's files.

Parity sources, for behavior and look only:

- Idle pill face of `packages/ui/src/components/navigation/Chip/Chip.tsx` and `Chip.module.scss` (`.chip` plus `.pill`, not `.selected` and not `.filter`). On the phone that face is already `SectionChip` variant `pill` via `chipFacePadding`, `chipLabelTypography`, `tokens.radii.round`, `tokens.background.secondary`, and `themeStyles.border.borderColor` (`tokens.border.tertiary`). Use that recipe. Do not give a tag the selected primary fill or the filter accent outline.
- Suggestion rows follow `packages/ui/src/components/form/FormDropdown/FormDropdown.module.scss` (`.dropdownMenu`, `.menuItem`): primary surface, opaque border, `tokens.radii.md`, item padding below. The list itself is in normal flow under the field. It is not `position: absolute`, and it is not an `AppOverlay`. A menu painted over the form is clipped by the screen scroll view, and a second window is the overlay path this control does not need.
- The text box is `TextField` (`apps/mobile/src/components/form/TextField.tsx`), the only painted input. Compact: no `eyebrow`. `SearchField` is the precedent for the clear control and for `autoCapitalize="none"` / `autoCorrect={false}`. Do not add a magnifying glass. This is tag entry, not directory search.

Tokens come from `useTheme` (`@podverse/design-tokens` through `apps/mobile/src/theme`). Styles go through `useThemedStyles` with a module-scope factory. Do not call `StyleSheet.create` inside the component.

## Draft helper

`apps/mobile/src/components/form/playlistTagDraft.ts`. Named exports only. No React, no React Native.

```typescript
export const TAG_SEARCH_DEBOUNCE_MS = 450

export type PlaylistTagCommitStatus = 'empty' | 'at-max' | 'too-long' | 'duplicate' | 'added'

export type PlaylistTagDraftResult = {
  status: PlaylistTagCommitStatus
  tags: readonly string[]
}

export function playlistTagSearchQuery(draft: string): string | null

export function commitPlaylistTagDraft(input: {
  tags: readonly string[]
  draft: string
  maxCount?: number
  maxLength?: number
}): PlaylistTagDraftResult
```

`playlistTagSearchQuery` trims and returns `null` when the trim is empty. Otherwise it returns the trimmed string.

`commitPlaylistTagDraft` trims `draft` and then:

- Trimmed length `0` → `empty`, same `tags` reference.
- `maxCount` is a number and `tags.length >= maxCount` → `at-max`, same reference. Check this before the duplicate check so a full list stays full.
- `maxLength` is a number and the trimmed length is greater than it → `too-long`, same reference.
- Some tag's `trim().toLowerCase()` equals the trimmed draft's `toLowerCase()` → `duplicate`, same reference. This is the same comparison `normalizeTitle` uses (`packages/helpers/src/lib/titleFilter.ts`). Do not import that helper, and do not import the `@podverse/helpers` barrel. Do not strip a leading article. Do not remove spaces inside the name.
- Otherwise → `added`, a new array that ends with the trimmed draft.

The visible chip keeps the spelling that was committed: the trimmed typed text, or the suggestion string the person tapped. The control does not lowercase the chip. Area A folds the name when the playlist is saved.

`450` matches `SEARCH_DEBOUNCE_MS` in `apps/mobile/src/screens/search/SearchScreen.tsx` and the trailing-debounce precedent in **input-rate-control**. An empty query is not debounced; the component cancels the timer and calls `onSearch('')` immediately. Do not use web `SearchInput`'s 1000ms timer.

## TextField

In `TextField`, add an optional `submitBehavior` prop typed as `TextInputProps['submitBehavior']`. Pass it through to the `TextInput` next to `onSubmitEditing`. Callers that omit it keep today's default (Return blurs the field). Do not change any other `TextField` behavior.

`PlaylistTagField` passes `submitBehavior="submit"` so Return commits the draft and leaves the keyboard up for another tag. React Native here is 0.88 (`apps/mobile/package.json`). If `TextInputProps` has no `submitBehavior`, stop and report. Do not substitute `blurOnSubmit`.

## PlaylistTagField props

`apps/mobile/src/components/form/PlaylistTagField.tsx`. Named export `PlaylistTagField`. Discriminated union on `editable`. The screen passes every user-visible string. The component does not call `useTranslation` and does not contain a user-facing literal. A developer `throw` is not needed; TypeScript requires the strings.

Shared:

- `tags: readonly string[]` — chips, in this order.
- `testID: string` — root id.

`editable: false` — chips only. No text field, no remove control, no menu, no limit line, no error line. `tags.length === 0` renders `null`.

`editable: true`:

- `draft: string` and `onDraftChange: (draft: string) => void` — the text box. The screen owns it so Save can commit a name that was never turned into a chip.
- `onChange: (tags: readonly string[]) => void` — the next chip list after an add or a remove. Call it only when the list changes.
- `onSearch: (query: string) => void` — trimmed query, or `''` when the box is cleared. The screen performs the search.
- `suggestions: readonly string[]` and `suggestionsFor: string` — the matches, and the query they belong to. Show a row only when `suggestionsFor` equals the current `playlistTagSearchQuery(draft)`. A slower response for an older query stays hidden.
- `searching: boolean` and `searchingLabel: string` — status line while the screen's request is in flight.
- `placeholder: string` — instruction in the empty box. Sentence case, from the screen. Not the field title.
- `inputAccessibilityLabel: string` — accessible name of the box. The visible title is the screen's `FormField`, outside this control, so the box still needs its own name.
- `clearDraftAccessibilityLabel: string` — `TextField` `clearAccessibilityLabel`. The X clears the draft only.
- `removeAccessibilityLabel: (tag: string) => string` — accessible name of that chip's remove control. The screen includes the tag text in the name so a row of removes is not a row of identical "Remove" buttons.
- `maxCount?: number` — when `tags.length >= maxCount`, hide the text box. Omit means no cap. This control does not hardcode 5. The playlist form passes `usePlaylistTagLimits().maxPerPlaylist`. That is 5 until `GET /config` arrives, and 5 if that request fails.
- `maxLength?: number` — forwarded to `TextField` `maxLength`. Omit means the box does not cap length. The playlist form passes `usePlaylistTagLimits().nameMaxLength`. That is 50 until the response arrives, and 50 if the request fails. Typing stops there. This control shows no sentence for that cap.
- `limitMessage?: string` — shown only when the box is hidden because `maxCount` is reached and this string is non-empty. The form builds it from the live count. When the count is 5 the English sentence is `A playlist has at most 5 tags.`
- `errorMessage?: string` — shown when non-empty. The screen sets and clears it. This control does not fetch, so it does not catch search failures. A non-empty error does not block Return, a suggestion press, or the draft the screen commits on Save.

Export the component and `PlaylistTagFieldProps` from `apps/mobile/src/components/form/index.ts`, immediately before the `SearchField` export. Also export `commitPlaylistTagDraft`, `playlistTagSearchQuery`, `TAG_SEARCH_DEBOUNCE_MS`, and the two result types from `playlistTagDraft.ts` through that barrel.

## Behavior

Debounce, in the component, only while `editable` is true:

- Keep `onSearch` in a ref so a new function identity does not reset the timer.
- Remember the last query sent.
- When `playlistTagSearchQuery(draft)` is `null`, clear any timer. If the last query sent was not `''`, call `onSearch('')` and remember `''`. Do not call `onSearch('')` on the first mount when the draft is already empty.
- When the trimmed query equals the last query sent, do nothing.
- Otherwise start a `TAG_SEARCH_DEBOUNCE_MS` timer, then call `onSearch` with the trimmed query and remember it.
- The effect cleanup clears the timer. Turning `editable` off clears it and does not search.

Commit paths, all through `commitPlaylistTagDraft`:

- Keyboard Return (`onSubmitEditing`) commits `draft`.
- A suggestion press commits that suggestion string, not the typed draft. The chip then shows the spelling the search returned.
- `added` → `onChange(result.tags)`, then `onDraftChange('')`.
- `duplicate` or `empty` → `onDraftChange('')` only. No error. A second chip for the same name is not added; clearing the box is the feedback.
- `at-max` or `too-long` → leave `draft` and `tags` as they are. Do not show a sentence for `too-long`. The screen does not put a save error on that status.
- After `added`, `duplicate`, or `empty`, focus the field again (`TextField` `inputRef`) so another tag can be typed.

Return commits the draft even when suggestion rows are visible, and even when `errorMessage` is non-empty. A suggestion press is the only path that commits a suggestion string instead of the draft.

Do not commit on blur. `TextField` blurs when the screen blurs, and a `setState` in that blur races the Save handler. The playlist form calls `commitPlaylistTagDraft` itself inside Save, with the current `tags`, `draft`, `maxCount`, and `maxLength`, and sends `result.tags`. A draft that is already empty leaves the chip list unchanged. The name is stored only when that save request succeeds.

Remove, only when `editable` is true: `onChange` with a new array that omits that index. Do not reorder the others. The remove control is a `Pressable` on the right side of the chip, `accessibilityRole="button"`, `hitSlop` 8, Ionicons `close` at 18 in `themeStyles.textSecondary.color`. The glyph is hidden from assistive tech (`accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`). The chip container is `accessible={false}` so the tag text and the remove button are reached separately, text first.

The suggestion list:

- Render it only when the trimmed query is non-null and either `searching` is true or there is at least one suggestion whose `suggestionsFor` equals that query.
- Stale suggestions (`suggestionsFor` differs) are not rendered. While `searching` is true and there are no current suggestions, render `searchingLabel` only.
- When the query is current, `searching` is false, and `suggestions` is empty, render no list. Return is how a new name becomes a chip. There is no "create" row.
- Do not slice the list. The screen passes the page area A returned.
- Each suggestion is a `Pressable`, `accessibilityRole="menuitem"`, one line, tail ellipsis. The list container is `accessibilityRole="menu"` when it has suggestion rows. A searching-only status is not a menu.
- `accessibilityLiveRegion="polite"` on the list container and on the error text.

`MobileScreenContainer` already sets `keyboardShouldPersistTaps="handled"` (`apps/mobile/src/components/screen/MobileScreenContainer.tsx`), so a tap on a suggestion is not swallowed while the keyboard is up. This plan does not change that container.

testIDs, all derived from the `testID` prop:

- Root: `testID`
- Chip: `${testID}-tag-${index}`
- Remove: `${testID}-tag-${index}-remove`
- Input: `${testID}-input` (passed to `TextField`)
- Clear: `${testID}-input-clear` (`TextField` `clearTestID`)
- Suggestions: `${testID}-suggestions`
- Suggestion row: `${testID}-suggestion-${index}`
- Searching line: `${testID}-searching`
- Limit line: `${testID}-limit`
- Error line: `${testID}-error`

Index follows the `tags` or `suggestions` array the screen passed.

## Look

Column (`gap: tokens.spacing.md`): chip wrap, then the field block, then the limit line, then the error line. A missing block is not rendered, so the gap does not leave a hole.

Chip wrap: `flexDirection: 'row'`, `flexWrap: 'wrap'`, `gap: chipRowGap()` from `apps/mobile/src/theme/screenLayout.ts`. Do not also set `marginRight` on a chip.

Each chip: `flexDirection: 'row'`, `alignItems: 'center'`, `gap: tokens.spacing.sm`, `maxWidth: '100%'`, `flexShrink: 1`, `borderWidth: 1`, plus `chipFacePadding(tokens.spacing)` and the idle pill colors above (`borderRadius: tokens.radii.round`). Tag text uses `chipLabelTypography`, `numberOfLines={1}`, `ellipsizeMode="tail"`, `flexShrink: 1`. The remove control is `flexShrink: 0` and does not change the chip's height.

Field block, only when editable and under `maxCount`:

- `TextField` with the accessibility label, placeholder, `maxLength`, `submitBehavior="submit"`, `returnKeyType="done"`, `autoCapitalize="none"`, `autoCorrect={false}`, the clear label, and `onChangeText={onDraftChange}`. No `eyebrow`. No leading icon.
- Menu, in normal flow, `marginTop: tokens.spacing.sm`, `width: '100%'`, `backgroundColor: tokens.background.primary`, `borderWidth: 1`, `borderColor: tokens.border.opaque`, `borderRadius: tokens.radii.md`, `paddingVertical: tokens.spacing.sm`.
- A suggestion row: `margin: tokens.spacing.md`, `paddingVertical: tokens.spacing.md`, `paddingHorizontal: tokens.spacing.xl`, `borderRadius: tokens.radii.md`, text `typography.body` in `tokens.text.primary`. Pressed background `tokens.background.opaque`. Those spacing steps are the FormDropdown item (`--spacing-md` margin, `--spacing-md` / `--spacing-xl` padding) and the menu's `--spacing-sm` offset and `--border-radius` (10, which is `tokens.radii.md`).

Limit line and error line: `typography.body`. Limit uses `themeStyles.textSecondary.color`. Error uses `tokens.text.danger`.

## What not to change

- Do not edit `PlaylistFormScreen.tsx`, `PlaylistDetailScreen.tsx`, `PlaylistListRow.tsx`, `BrowseScreen.tsx`, or `playlistRepository.ts`.
- Do not edit `packages/ui`, Chip, FormDropdown, or SearchInput.
- Do not add catalog keys, and do not edit `release-notes/scratchpad.md`.
- Do not import `@podverse/ui`, `@podverse/helpers-requests`, or a repository.
- Do not put the product cap of 5, or a max tag length, in this control. The screen passes the live limits.
- Do not add a Maestro flow or a harness screen.
