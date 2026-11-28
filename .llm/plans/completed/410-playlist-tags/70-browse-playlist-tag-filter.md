**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Mobile Browse playlists tag filter

Browse playlists gains one tag filter. The public recent and public top calls already take `tag`. This plan passes that parameter from the playlists branch and gives the person a way to set it and clear it. My Playlists and Subscribed stay as they are.

## Rows

R16

## Runs after

13, 30

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue.

## Decisions

- No mobile env for the tag. Browse's list-screen env is the media-type chip, the sort, and the view (`EXPO_PUBLIC_BROWSE_DEFAULT_CHIP`, `EXPO_PUBLIC_BROWSE_DEFAULT_SORT`, `EXPO_PUBLIC_BROWSE_DEFAULT_VIEW` in `apps/mobile/src/config/env.ts`). Range has no env. A tag name is not one of those three tokens, so leaving it out does not break that pattern. The opening selection is no tag. The web playlists env stays with the web plan. Do not add `EXPO_PUBLIC_BROWSE_DEFAULT_TAG`, and do not edit `apps/mobile/src/config/env.ts`, `getMobileConfig().listScreens`, or a `.env` example.
- The applied tag is remembered on the Browse playlists entry only (`browseListScope('playlists')`, storage key `sort.browse-playlists`, field `tag`). The text still in the sheet is not remembered. Clearing removes the field. The other choice was keeping the tag only until the screen is left. Sort and range on this same list are already remembered, and a chosen tag is that kind of filter. A search box is not.
- The chip shows and the request sends the folded name. Suggestion rows are already folded. Return folds the typed text before it applies. There is no second display spelling.
- The control is a filter chip and a sheet, not `PlaylistTagField`. That field edits a list of tags on a playlist. This one applies a single name to a public list and does not save a tag.
- Return applies the folded typed name even when that name is not in the suggestion list. An unknown name is an empty page, which the public list already returns. The sheet does not insert a tag row.
- One tag. A new choice replaces the previous one. Private and followed playlist routes are not called.

## What this plan is

Public Browse playlists only. `fetchBrowseFeedRows` already calls `reqPlaylistGetMany` with `type: 'public'` when the media type is `playlists` (`apps/mobile/src/screens/browse/browseFeedData.ts`). Pass `tag` on that call. Omit the property when there is no tag. Do not add `tag` to `QueryParamsPlaylists` or to the playlist request helper. Plan 13 already did.

Signed-out Browse can use the filter. The list and the name search are public. Do not add a login gate. Do not add a medium chip. Playlists stay `medium: 'all'`.

Do not edit `LibraryPlaylistsScreen.tsx`, `playlistListPrefs.ts`, `PlaylistListRow.tsx`, `PlaylistFormScreen.tsx`, `PlaylistTagField.tsx`, `playlistTagDraft.ts`, `TextField.tsx`, the web playlists page, or area A's files.

## Remembered tag

`packages/helpers/src/lib/sortPrefs.ts`. Add optional `tag?: string` on `SortPrefValue`, and add `'tag'` to `SORT_PREF_FIELDS`. `MAX_TOKEN_LENGTH` stays 64. A stored name longer than that is dropped, the same as any other field.

Replace the comment above `SortPrefValue` so it stays true of the type. Each field except `tag` is a short token chosen from a control. `tag` is the playlist tag name the Browse playlists list applied. It is one folded name, not the text still in the search box. Unrecognised fields are still dropped.

`packages/helpers/src/lib/sortPrefs.test.ts`:

- `sanitizeSortPrefValue({ tag: 'adam curry', sort: 'recent' })` keeps both.
- A `tag` of 65 characters is dropped. A payload that is only that long tag becomes `null`.
- `mergeSortPrefValue({ sort: 'recent', tag: 'news' }, { tag: undefined })` equals `{ sort: 'recent' }`.

`packages/helpers/src/lib/browseListScope.ts`. Extend the doc comment so the playlists entry also remembers the applied tag. Do not change `browseListScope`.

`apps/mobile/src/screens/browse/browseListPrefs.ts`. Add `tag: string | null` on `BrowseListPrefs`. Import `normalizePlaylistTagName` from `@podverse/helpers/playlistTag`. Leave the existing `@podverse/helpers` imports in this file.

`readBrowseListPrefs`: when `mediaType` is `playlists`, set `tag` from `normalizePlaylistTagName` on `entry?.tag`. Any other result, including a missing field, is `null`. When `mediaType` is not `playlists`, `tag` is `null` even if that entry has a `tag` string.

`writeBrowsePlaylistTag(mediaType, tag: string | null)`:

- `mediaType !== 'playlists'`: return without writing.
- `tag === null`: `writeSortPref(browseListScope('playlists'), { tag: undefined })`. Sort and range on that entry stay.
- Otherwise fold with `normalizePlaylistTagName`. On failure, return without writing. On success, write `{ tag: folded.name }` to the playlists scope.

`apps/mobile/src/screens/browse/browseListPrefs.test.ts`, beside the existing playlists case:

- After `writeBrowseMediaType('playlists')`, `tag` is `null`.
- `writeBrowsePlaylistTag('playlists', '  ADAM   CURRY ')` stores `tag: 'adam curry'` on `sort.browse-playlists` and leaves a previously written sort in that same JSON object.
- `writeBrowsePlaylistTag('playlists', null)` removes `tag` and keeps `sort`.
- `writeBrowsePlaylistTag('podcasts', 'adam curry')` does not write `sort.browse-podcasts`.
- A stored `tag` of 51 characters on `sort.browse-playlists` reads back as `tag: null`.
- Reading while the media type is podcasts returns `tag: null` when the playlists entry holds `adam curry`.

## Query

New `apps/mobile/src/screens/browse/browsePlaylistQuery.ts`. No React and no React Native. Named exports.

`appliedBrowsePlaylistTag(raw: string | null): string | null` returns `null` for `null` and for a name `normalizePlaylistTagName` rejects. Otherwise it returns the folded name.

`browsePlaylistListParams` takes `{ page, range, sort, tag }` and returns the object `reqPlaylistGetMany` receives for Browse playlists:

- `medium: 'all'`, `type: 'public'`, `page`, `sort`, and `range` from `browseSortToApiRange` (Recent sends `null`).
- When `appliedBrowsePlaylistTag` returns a name, the object includes `tag` set to that name.
- When it returns `null`, the object has no `tag` property. Do not set `tag: null` or `tag: ''`.

`apps/mobile/src/screens/browse/browsePlaylistQuery.test.ts`:

- No tag, and a whitespace tag, omit `tag`. Sort `recent` still sends `range: null`.
- `'  ADAM CURRY '` sends `tag: 'adam curry'` and keeps `medium: 'all'` and `type: 'public'`.
- Sort `top` with range `week` sends `range: 'week'` and the folded tag together.
- A 51-character tag omits `tag`.

`browseFeedData.ts` `fetchBrowseFeedRows`, the `mediaType === 'playlists'` branch only: build the argument with `browsePlaylistListParams`. Add `tag: string | null` to `BrowseFeedOptions`. Other branches ignore `tag`. Do not pass `tag` into channel, item, clip, account, or livestream calls.

Add `searchBrowsePlaylistTags(authDeps, query: string)` in the same file. It uses `requestWithMobileAuthRefresh` and `api.reqPlaylistTagSearch(query)` (the method plan 12 adds). Return `response.data`. A thrown error propagates. Do not catch it here. Do not call it for an empty query. The chip does that.

## Chip and sheet

New `apps/mobile/src/screens/browse/BrowsePlaylistTagChip.tsx`. Named export. It calls `useTranslation`, the same way `BrowseSortChip` does. Styles go through `useThemedStyles` with a module-scope factory.

The face uses `filterChipChrome`, `chipFacePadding`, and `chipLabelTypography` from `apps/mobile/src/components/form/chipChrome.ts`, the same filter outline as `MenuSelectChip`. Do not edit `SectionChip` or `MenuSelectChip`.

- Mount the chip only for playlists. The screen does that. This file does not check the media type.
- No tag: visible label `filters.tag.tag` (`Tag`). `accessibilityState.selected` is false.
- A tag: visible label is the folded name, one line, tail ellipsis. Accessible name is `filters.tag.selected` (`Tag: {tag}`). `accessibilityState.selected` is true.
- `accessibilityRole="button"`. testID `browse-playlist-tag-button`.
- Press opens the sheet. It does not clear the tag.

The sheet is an `AppOverlay` with `animation="none"`, the same presentation as `MoreMenu`. Do not use `Modal`. Backdrop press, Android back, and Cancel close the sheet and drop the typed text. They do not change the applied tag.

Sheet contents, top to bottom:

- Title `filters.tag.tag`.
- When a tag is applied, one line `filters.tag.selected`.
- `TextField` with no eyebrow. Accessible name `filters.tag.tag`. Placeholder `filters.tag.placeholder` (`Type a tag`). Those two strings stay different. `autoCapitalize="none"`, `autoCorrect={false}`, `returnKeyType="done"`. The X uses `filters.tag.clear_text` and clears the typed text only. testIDs: input `browse-playlist-tag-input`, clear `browse-playlist-tag-input-clear`.
- Suggestions in normal flow under the field, not an absolute menu and not a second overlay. Row metrics match `PlaylistTagField`: primary background, opaque border, `tokens.radii.md`, body text, one line, tail ellipsis. The list scrolls inside the sheet (`keyboardShouldPersistTaps="handled"`) so a row stays reachable with the keyboard up. Cancel stays at the bottom of the sheet, outside that scroll, in the same cancel block `MoreMenu` uses (`misc.cancel`, testID `browse-playlist-tag-cancel`).
- When a tag is applied, a Clear Filter row above Cancel. Label `misc.clear_filter`. testID `browse-playlist-tag-clear`. It calls `onChange(null)` and closes.

Search, inside the chip:

- Import `TAG_SEARCH_DEBOUNCE_MS` and `playlistTagSearchQuery` from `apps/mobile/src/components/form`. Do not debounce a second time on top of that wait. Do not edit those exports.
- Keep `onSearch` in a ref.
- An empty trim cancels the timer, clears the rows, and does not call `onSearch`.
- Otherwise wait `TAG_SEARCH_DEBOUNCE_MS`, then call `onSearch` with the trimmed query. A generation counter drops a response for an older query. Show a row only when it belongs to the query now in the box.
- While that request is out, show `filters.tag.searching` (`Searching tags.`) and no stale rows. testID `browse-playlist-tag-searching`.
- On throw, show `errors.generic` (testID `browse-playlist-tag-error`) and no rows. Do not change the applied tag and do not touch the playlist list's own error.
- Each suggestion is a button, testID `browse-playlist-tag-suggestion-${index}`, `accessibilityRole="button"`. Press calls `onChange` with that string and closes. The list container is `browse-playlist-tag-suggestions`.
- Return (`onSubmitEditing`): fold with `normalizePlaylistTagName`. `ok` calls `onChange` with the folded name and closes. `empty` does nothing. `too_long` leaves the sheet open and shows `filters.tag.too_long` (`A tag is at most 50 characters.`) in the error slot. Do not send the long string.

`onChange: (tag: string | null) => void` is the only write. `onSearch: (query: string) => Promise<string[]>` is the only read. The chip does not import the API client.

Opening the sheet starts from an empty box. It does not copy the applied tag into the field.

## BrowseScreen

`apps/mobile/src/screens/browse/BrowseScreen.tsx`. Anchors: `loadFeed`, `loadNextFeedPage`, the effect that calls `loadFeedRef.current('initial')`, and the `MediaTypeSelector` `trailing` slot. Do not read the file end to end.

- Both `fetchBrowseFeedRows` option objects include `tag`. When `activePrefs.mediaType === 'playlists'`, pass `activePrefs.tag`. Otherwise pass `null`.
- Add `activePrefs?.tag` to the effect dependency list next to `activePrefs?.sort` and `activePrefs?.range`, so a tag change loads page 1. The next page uses the same options, including the tag.
- `handlePlaylistTagChange` calls `writeBrowsePlaylistTag(selectedMediaType, tag)` and nothing else. The existing `subscribeBrowseListPrefs` read is what updates `listPrefs`. Do not also `setListPrefs` for the tag.
- In `trailing`, before `BrowseSortChip`: when `displayedMediaType === 'playlists'`, render `BrowsePlaylistTagChip`. The sort chip stays last. Pass `tag` from `sortChipPrefs` when that object's `mediaType` is `playlists`, otherwise `null`. Wire `onSearch` to `searchBrowsePlaylistTags` with the screen's auth fields (`accessToken`, `clearSession`, `refreshToken`, `setTokens`), held in a `useCallback`.
- Podcasts, users, livestreams, and the other media types do not mount the chip. Library is a different screen and is unchanged.

## Catalog

Add `filters.tag` to the consumer originals, after `filters.type`, in all four locales. Search the `"filters"` object and insert there. Do not rewrite the file. Do not edit `overrides/` or `compiled/`.

From the repo root, run `npm run i18n:compile` so the phone bundle picks up the keys. Compiled output is gitignored. Do not commit it.

English:

- `tag`: `Tag`
- `placeholder`: `Type a tag`
- `suggestions`: `Tag Suggestions`
- `searching`: `Searching tags.`
- `too_long`: `A tag is at most 50 characters.`
- `selected`: `Tag: {tag}`
- `clear_text`: `Clear Tag Text`

Spanish:

- `tag`: `Etiqueta`
- `placeholder`: `Escribe una etiqueta`
- `suggestions`: `Sugerencias de etiquetas`
- `searching`: `Buscando etiquetas.`
- `too_long`: `Una etiqueta tiene como máximo 50 caracteres.`
- `selected`: `Etiqueta: {tag}`
- `clear_text`: `Borrar texto de etiqueta`

French:

- `tag`: `Étiquette`
- `placeholder`: `Saisissez une étiquette`
- `suggestions`: `Suggestions d'étiquettes`
- `searching`: `Recherche d'étiquettes.`
- `too_long`: `Une étiquette compte au plus 50 caractères.`
- `selected`: `Étiquette : {tag}`
- `clear_text`: `Effacer le texte de l'étiquette`

Greek:

- `tag`: `Ετικέτα`
- `placeholder`: `Πληκτρολογήστε μια ετικέτα`
- `suggestions`: `Προτάσεις ετικετών`
- `searching`: `Αναζήτηση ετικετών.`
- `too_long`: `Μια ετικέτα έχει το πολύ 50 χαρακτήρες.`
- `selected`: `Ετικέτα: {tag}`
- `clear_text`: `Εκκαθάριση κειμένου ετικέτας`

`{tag}` stays in every locale. English chrome is title case. The searching and too-long lines are sentences. The other three locales keep the capitalization above.

The suggestions key is the accessible name of the suggestion list (`accessibilityLabel`). The rows themselves show the tag names.

## Maestro

Extend `apps/mobile/e2e/browse.yaml`. Do not add a new top-level flow. The sort chip stays the last control in the trailing slot.

After the podcasts sort chip is visible, `assertNotVisible` `browse-playlist-tag-button`.

After the playlists tap and the playlist-row wait, run `shared/reveal-chip-row-trailing.yaml` with `CHIP_ROW_ID` `browse-media-type-selector` and `TRAILING_ID` `browse-sort-button`. Then `assertVisible` `browse-playlist-tag-button` and the existing `Sort: Recent` text. Tap `browse-playlist-tag-button`, wait for `browse-playlist-tag-sheet` with `${TIMEOUT_FAST}`, tap `browse-playlist-tag-cancel`, and `assertNotVisible` `browse-playlist-tag-sheet`. Keep the playlists screenshot.

After the users list is visible, `assertNotVisible` `browse-playlist-tag-button`.

Do not type a tag in this flow, and do not seed a playlist tag. The unit tests own the query string. The flow owns the chip being on playlists and off the other two types this flow already opens.

## Tests

Unit tests listed above: `packages/helpers/src/lib/sortPrefs.test.ts`, `apps/mobile/src/screens/browse/browseListPrefs.test.ts`, and `apps/mobile/src/screens/browse/browsePlaylistQuery.test.ts`.

No API integration test. No Playwright spec. The Maestro edits are the `browse.yaml` steps above. No new flow file, so do not edit `HOW-TO-RUN.md` or the full-repo verification list.

## Files

- `packages/helpers/src/lib/sortPrefs.ts`
- `packages/helpers/src/lib/sortPrefs.test.ts`
- `packages/helpers/src/lib/browseListScope.ts`
- `apps/mobile/src/screens/browse/browsePlaylistQuery.ts`
- `apps/mobile/src/screens/browse/browsePlaylistQuery.test.ts`
- `apps/mobile/src/screens/browse/browseListPrefs.ts`
- `apps/mobile/src/screens/browse/browseListPrefs.test.ts`
- `apps/mobile/src/screens/browse/browseFeedData.ts`
- `apps/mobile/src/screens/browse/BrowsePlaylistTagChip.tsx`
- `apps/mobile/src/screens/browse/BrowseScreen.tsx`
- `packages/i18n-catalog/consumer/originals/en-US.json`
- `packages/i18n-catalog/consumer/originals/es.json`
- `packages/i18n-catalog/consumer/originals/fr.json`
- `packages/i18n-catalog/consumer/originals/el-GR.json`
- `apps/mobile/e2e/browse.yaml`
- `release-notes/scratchpad.md`

## Release scratchpad

```markdown
## Browse playlists can filter by one tag

- Surfaces: mobile
- Change: On Browse, the Playlists list has a Tag control. Choosing a tag shows public playlists with that tag, and clearing it shows the full public list again. The choice is remembered on the device. The typed text in the sheet is not. My Playlists and Subscribed do not have this control, and there is no mobile env default for it.
- Who notices: people browsing public playlists on the phone
- Operator steps: none
```
