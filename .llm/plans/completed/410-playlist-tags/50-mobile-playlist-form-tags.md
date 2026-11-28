**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Mobile playlist form tags

The phone create and edit screen can hold tags up to the configured count and save them with the playlist. Return adds the typed name as a chip. Save also commits text still in the box. Blur does not add a chip. There is no create row. The name is stored only when that save succeeds. Autocomplete reads names that are already stored. It does not insert one. The count and the character cap come from `usePlaylistTagLimits()` (plan 102).

## Rows

R1, R2, R3, R4, R6, R15, R31, R33, R34, R35, R36

R3 is the phone half. The web form covers its half. R33–R36 are the same commit, cap, field order, and search-failure behavior on both forms.

## Runs after

10, 11, 12, 30, 102

## Files

- apps/mobile/src/screens/library/playlistFormTags.ts
- apps/mobile/src/screens/library/playlistFormTags.test.ts
- apps/mobile/src/screens/library/PlaylistFormScreen.tsx
- apps/mobile/src/data/repositories/playlistRepository.ts
- packages/i18n-catalog/consumer/originals/en-US.json
- packages/i18n-catalog/consumer/originals/es.json
- packages/i18n-catalog/consumer/originals/fr.json
- packages/i18n-catalog/consumer/originals/el-GR.json
- apps/mobile/e2e/library-playlists.yaml

## Tests

Unit tests in `apps/mobile/src/screens/library/playlistFormTags.test.ts` for `playlistFormTagsForSave`. Mobile has no React Native component renderer, so `PlaylistFormScreen` is not mounted. No repository test: `create`, `edit`, and `searchTags` forward arguments and do not decide the list. No API integration test and no Playwright spec. Area A covers the HTTP contract.

Extend `apps/mobile/e2e/library-playlists.yaml`. Do not add a second flow, and do not edit `scripts/mobile/e2e-test.sh`, `apps/mobile/e2e/HOW-TO-RUN.md`, or `docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md`. `library-playlists` is already an API-backed flow.

Cases for `playlistFormTagsForSave`:

- A whitespace-only draft returns `ok` with `clearDraft` true and the same `tags` reference.
- `"Morning Set"` is appended with that spelling, `clearDraft` true, and a new array.
- A draft of `"adam  curry"` keeps the two spaces inside the name.
- `"jazz"` against tags `["Jazz"]` returns `ok`, `clearDraft` true, and the same `tags` reference.
- `maxCount` 5 with 5 tags already returns `ok`, `clearDraft` false, and the same `tags` reference.
- A draft longer than `maxLength` returns `ok`, `clearDraft` false, and the same `tags` reference. It does not return an error reason.
- A draft the same length as `maxLength` is appended.

The device flow, in the existing create / edit / delete path:

- On create, commit `Morning Set` and assert chip `playlist-form-tags-tag-0` with that text before Save.
- On edit, the chip text is the folded `morning set`.
- Typing `morn` shows `playlist-form-tags-suggestion-0`. Tapping it does not add `playlist-form-tags-tag-1`.
- Removing `playlist-form-tags-tag-0` and saving, then opening edit again, leaves that chip absent.

## Release scratchpad

```markdown
## Tags on mobile playlist create and edit

- Surfaces: mobile
- Change: Creating or editing a playlist on the phone can include tags. The count and the character cap come from public config, and are 5 and 50 until that response arrives or if the request fails. At the count, the text box hides and a sentence names that count. Typing stops at the character cap. Return adds the typed name as a chip. Save also saves text still in the box. A new name is stored only when the playlist is saved. A failed tag search shows the generic error on the field, and Return and Save still add the typed name. Removing every tag and saving clears them.
- Who notices: someone creating or editing a playlist in the phone app
- Operator steps: none
```

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue.

## What this plan is

`PlaylistFormScreen` gains the tag field from plan 30. `playlistRepository.create` and `edit` send the list the form is showing. `playlistRepository.searchTags` calls the public prefix search from plan 12. Nothing in this plan inserts a tag except the playlist create or edit request.

Reuse:

- `PlaylistTagField`, `commitPlaylistTagDraft`, and `playlistTagSearchQuery` from `apps/mobile/src/components/form` (plan 30). Do not edit that folder or `TextField`.
- `usePlaylistTagLimits()` from `apps/mobile/src/config/publicClientConfig.ts` (plan 102). It returns `{ maxPerPlaylist, nameMaxLength }`. The first render, and a failed `GET /config`, are `{ maxPerPlaylist: 5, nameMaxLength: 50 }` from the helper constants inside that hook. Do not import those constants in the screen. Do not add a second fallback. If the hook is missing, stop and report. Do not import the `@podverse/helpers` barrel. The screen already imports enums from that barrel; leave those imports.
- `playlistRepository` is the only place the screen calls the playlist API. Do not call `ApiRequestService` from the screen.
- `FormField` wraps the control. The label and the placeholder are different strings (**form-eyebrow-placeholder**).

Confirm these symbols exist before editing the screen. They land in plans 10, 11, 12, 30, and 102.

- `usePlaylistTagLimits` is exported from `apps/mobile/src/config/publicClientConfig.ts` (plan 102). If it is missing, stop and report.

- `reqPlaylistCreate` sends its params object as the body, so a `tags` key on those params is sent.
- `reqPlaylistEdit` in `packages/helpers-requests/src/api/playlist/playlist.ts` copies `tags` into the PATCH `data` only when `params.tags !== undefined` (plan 11). Do not edit that file. If that copy is missing, stop and report. Do not rebuild the PATCH body in the repository.
- `ApiRequestService.reqPlaylistTagSearch(q)` exists (plan 12). If the method is missing, stop and report.

## Save decision

`apps/mobile/src/screens/library/playlistFormTags.ts`. Named export. No React and no React Native. Import `commitPlaylistTagDraft` from `../../components/form/playlistTagDraft`, not from the form barrel, so the unit test does not load the component.

```typescript
export type PlaylistFormTagsSaveResult = {
  ok: true
  tags: readonly string[]
  clearDraft: boolean
}

export function playlistFormTagsForSave(input: {
  tags: readonly string[]
  draft: string
  maxCount: number
  maxLength: number
}): PlaylistFormTagsSaveResult
```

Call `commitPlaylistTagDraft` with those four fields. The result is always `ok: true`. There is no save error for a draft that is longer than `maxLength`. The text box already stops at that length.

- `too-long` or `at-max` → `{ ok: true, tags: result.tags, clearDraft: false }`.
- `added`, `duplicate`, and `empty` → `{ ok: true, tags: result.tags, clearDraft: true }`.

The chip spelling stays whatever `commitPlaylistTagDraft` returns. This function does not fold, trim again, or collapse spaces. Plan 10 folds when the playlist is saved. The next time edit loads, the form shows the folded strings from the payload.

Changing a tag is remove plus add. The control has no rename field. Save sends the whole list.

## Repository

`playlistRepository` in `apps/mobile/src/data/repositories/playlistRepository.ts`. Anchors: `create` (about line 610) and `edit` (about line 633). Do not read the file end to end.

Add optional `tags?: string[]` to the inline param objects of `create` and `edit`. Keep passing that same object to `api.reqPlaylistCreate` and `api.reqPlaylistEdit`. An omitted `tags` key stays omitted. A present key, including `[]`, stays present. Do not drop `[]`.

Add `searchTags`:

```typescript
searchTags: async (
  context: MobileAuthRequestContext,
  q: string
): Promise<readonly string[]> => {
  const response = await requestWithMobileAuthRefresh(context, async (api) =>
    api.reqPlaylistTagSearch(q)
  );
  return response.data;
}
```

`searchTags` does not call `assertOnlineWrite`, does not write SQLite, and does not create a tag. `create` and `edit` keep `assertOnlineWrite`. The create and edit responses already go through `upsertPlaylists`, which stores the returned `DTOPlaylist` in `payload_json`. Tags on that object are stored with it. Do not add a column, a SQLite migration, or a second write.

`playlistFromRow` returns the parsed payload when parsing works. Leave that path as it is, including a payload that has no `tags` key. Do not add `tags` to the fallback object used when parsing fails.

`mapPlaylistToNode` in `apps/mobile/src/data/repositories/libraryBrowseProjection.ts` builds a car row from `id_text` and `title`. Do not edit it. Tags are not a car-row field.

Edit loads with `getByIdText(..., { refresh: true })` already. Keep that. After a refresh, `playlist.tags ?? []` is the list to show. A missing key is an empty list. Do not treat a missing key as "leave the stored tags untouched" on the following save: the save sends the list on screen, and for the owner that list came from the refresh.

## Screen

`apps/mobile/src/screens/library/PlaylistFormScreen.tsx`.

State, next to the title state:

- `tags: readonly string[]`, initial `[]`
- `draft: string`, initial `''`
- `tagSuggestions: readonly string[]`, initial `[]`
- `tagSuggestionsFor: string`, initial `''`
- `tagSearching: boolean`, initial `false`
- `tagErrorKey: string | null`, initial `null`
- `tagSearchRequestIdRef`, a `useRef(0)`, same generation pattern as `searchRequestIdRef` in `apps/mobile/src/screens/search/SearchScreen.tsx` (about line 201)

On a successful owner load, `setTags(playlist.tags ?? [])` and `setDraft('')`. Do not copy tags into the draft. The signed-out, loading, and not-owner branches stay as they are and do not render the field.

`canSubmit` stays "signed in, title non-empty, not already submitting". Tags are optional. Zero tags can be saved.

`handleTagSearch(query: string)`:

- Bump the request id first.
- `query === ''`: clear suggestions, set `tagSuggestionsFor` to `''`, set `tagSearching` false, set `tagErrorKey` null, and return. Do not call `searchTags`. The route rejects a blank `q`.
- Otherwise set `tagSearching` true and `tagErrorKey` null, then `playlistRepository.searchTags(authArgs, query)`.
- Apply the result only when this request id is still current. On success, `setTagSuggestions(response)` and `setTagSuggestionsFor(query)`. On throw, `setTagSuggestions([])`, `setTagSuggestionsFor(query)`, and `setTagErrorKey('errors.generic')`. That key's English is `Something went wrong. Please try again later, or contact support for assistance.` Return and Save still commit the draft.
- In `finally`, set `tagSearching` false only when this request id is still current.
- Leave `tagSuggestionsFor` on the previous query until this response arrives, so rows for an older query stay hidden while `searching` is true.

The field is the last block in the `styles.fields` column, after the sharable-status `FormField`, and before Cancel and Save. Do not place it under the title or under Description. On this screen Description is above Sharable Status, so last means after Sharable Status.

```tsx
<FormField label={t('features.playlist.tags')}>
  <PlaylistTagField
    clearDraftAccessibilityLabel={t('features.playlist.clear_tag_text')}
    draft={draft}
    editable={true}
    errorMessage={tagErrorKey !== null ? t(tagErrorKey) : ''}
    inputAccessibilityLabel={t('features.playlist.tags')}
    limitMessage={t('features.playlist.tag_limit', { count: tagLimits.maxPerPlaylist })}
    maxCount={tagLimits.maxPerPlaylist}
    maxLength={tagLimits.nameMaxLength}
    onChange={setTags}
    onDraftChange={setDraft}
    onSearch={handleTagSearch}
    placeholder={t('features.playlist.tag_placeholder')}
    removeAccessibilityLabel={(tag) => t('features.playlist.remove_tag', { tag })}
    searching={tagSearching}
    searchingLabel={t('features.playlist.tag_searching')}
    suggestions={tagSuggestions}
    suggestionsFor={tagSuggestionsFor}
    tags={tags}
    testID="playlist-form-tags"
  />
</FormField>
```

`tagLimits` is `usePlaylistTagLimits()`. `editable={true}` is the literal, so the editable props type-check. The screen does not debounce. The control does. The screen does not commit on blur. The control does not either. `tagErrorKey` is only the search failure. Do not set it for a long draft.

`handleSubmit`, before `setIsSubmitting(true)`:

```typescript
const saved = playlistFormTagsForSave({
  tags,
  draft,
  maxCount: tagLimits.maxPerPlaylist,
  maxLength: tagLimits.nameMaxLength,
});
setTags(saved.tags);
if (saved.clearDraft) {
  setDraft('');
}
```

Do not return early for a long draft, and do not return early when `tagErrorKey` is set. Return and Save still add the typed name after a failed search. The input stops at `nameMaxLength`, so a too-long draft is only a backstop: the chips save, the draft stays, and no sentence is shown for it.

Then start submitting and pass `tags: [...saved.tags]` on both `playlistRepository.create` and `playlistRepository.edit`, including when that array is empty. Create with `[]` stores no tags. Edit with `[]` clears tags. Omitting the key on edit would leave the previous tags in place, so do not omit it.

A thrown create or edit still uses the existing `handleGateError` path and `setErrorKey('errors.generic')` on `playlist-form-error`. Do not also put that failure on `tagErrorKey`. Clear `tagErrorKey` when the submit actually starts.

Add `tags` and `draft` to the `handleSubmit` dependency list.

Do not add a `StyleSheet` for the tag field. `FormField` and `PlaylistTagField` own the layout. Do not change delete, the sharable chips, or the medium chips.

## Copy

Search `playlist_type` in each consumer originals file and insert a key immediately after it only when that key is absent. Do not rewrite the file. Do not edit `overrides/` or `apps/*/i18n/compiled/`. After the four originals, run `npm run i18n:compile` from the repo root. Compiled catalogs are gitignored.

The web form plan inserts the same `tags`, `tag_placeholder`, `clear_tag_text`, `remove_tag`, and `tag_limit` strings. If one of those keys is already present with the value below, leave it. If `tag_limit` is present with a hardcoded `5`, replace that value with the `{count}` sentence. If `tag_too_long` or `add_tag` is present, delete that key. Do not add `tag_too_long`. Typing stops at the character cap, and Save does not show a sentence for it. Do not add a one-tag variant. The sentence uses the plural word for every count, including 1.

English, in `packages/i18n-catalog/consumer/originals/en-US.json`:

- `features.playlist.tags` — `Tags`
- `features.playlist.tag_placeholder` — `Type a tag`
- `features.playlist.clear_tag_text` — `Clear Tag Text`
- `features.playlist.remove_tag` — `Remove {tag}`
- `features.playlist.tag_searching` — `Searching tags...`
- `features.playlist.tag_limit` — `A playlist has at most {count} tags.`

`Tags` is the field title and the text box's accessible name. `Type a tag` is the empty-box instruction. They are different strings. `Clear Tag Text` and `Remove {tag}` are control names. The status and the limit sentence stay sentence case. Keep the `{tag}` and `{count}` placeholder spelling in every locale. Pass `count: tagLimits.maxPerPlaylist`. When that number is 5 the English sentence is `A playlist has at most 5 tags.`

The search failure reuses `errors.generic`. Do not add a key for it. English is `Something went wrong. Please try again later, or contact support for assistance.`

Spanish (`es.json`), using this file's "lista de reproducción":

- `Etiquetas`
- `Escribe una etiqueta`
- `Borrar texto de la etiqueta`
- `Quitar {tag}`
- `Buscando etiquetas...`
- `Una lista de reproducción tiene como máximo {count} etiquetas.`

French (`fr.json`), using this file's "playlist":

- `Étiquettes`
- `Saisissez une étiquette`
- `Effacer le texte de l'étiquette`
- `Retirer {tag}`
- `Recherche d'étiquettes...`
- `Une playlist a au plus {count} étiquettes.`

Greek (`el-GR.json`):

- `Ετικέτες`
- `Πληκτρολογήστε μια ετικέτα`
- `Απαλοιφή κειμένου ετικέτας`
- `Αφαίρεση {tag}`
- `Αναζήτηση ετικετών...`
- `Μια λίστα αναπαραγωγής έχει το πολύ {count} ετικέτες.`

Do not add `Add "{query}"` or `Tag Suggestions`. The phone control has no create row and no separate menu title. The web form adds `Tag Suggestions` for its list label. Leave that key if it is already present.

## Device flow

Edit `apps/mobile/e2e/library-playlists.yaml` only. Timeouts stay on the shared ladder. The tag search wait is `${TIMEOUT_SLOW}`. Scroll waits are `${TIMEOUT_FAST}`.

The create form's title `pressKey: Enter` exists to dismiss the title keyboard before Save. After this change the tag field is what holds focus, and Enter on that field commits a tag instead of dismissing the keyboard. Remove that create-path `pressKey: Enter`. Keep the edit-path `pressKey: Enter` that follows `inputText: " Edited"`.

Create, after the unlisted chip tap and before the create screenshot:

```yaml
- scrollUntilVisible:
    element:
      id: playlist-form-tags-input
    direction: DOWN
    timeout: ${TIMEOUT_FAST}
- tapOn:
    id: playlist-form-tags-input
- inputText: "Morning Set"
- pressKey: Enter
- assertVisible:
    id: playlist-form-tags-tag-0
- assertVisible:
    text: "Morning Set"
- hideKeyboard
- scrollUntilVisible:
    element:
      id: playlist-form-submit
    direction: DOWN
    timeout: ${TIMEOUT_FAST}
```

The playlist is unlisted before Save, so the folded name is eligible for the public prefix search. Enter commits the chip and leaves the keyboard up; `hideKeyboard` is what clears it. Blur does not commit a second time.

Edit, after `playlist-form-medium-readonly` is visible and before the title tap:

```yaml
- scrollUntilVisible:
    element:
      id: playlist-form-tags-tag-0
    direction: DOWN
    timeout: ${TIMEOUT_FAST}
- assertVisible:
    text: "morning set"
- tapOn:
    id: playlist-form-tags-input
- inputText: "morn"
- hideKeyboard
- extendedWaitUntil:
    visible:
      id: playlist-form-tags-suggestion-0
    timeout: ${TIMEOUT_SLOW}
- tapOn:
    id: playlist-form-tags-suggestion-0
- assertNotVisible:
    id: playlist-form-tags-tag-1
- tapOn:
    id: playlist-form-tags-tag-0-remove
- assertNotVisible:
    id: playlist-form-tags-tag-0
```

`hideKeyboard` before the suggestion wait because the menu is in the scroll view under the field, and blur does not clear the draft `morn`. Tapping the suggestion commits the stored spelling. That name is already a chip, so the draft clears and a second chip is not added. Then remove the chip and continue into the existing title edit and Save.

On the later edit that deletes the playlist, after `playlist-form-screen` is visible and before `playlist-form-delete`:

```yaml
- assertNotVisible:
    id: playlist-form-tags-tag-0
```

That is the check that the empty list was stored.

## What not to change

- Do not edit `apps/mobile/src/components/form/**`, `PlaylistListRow.tsx`, `PlaylistDetailScreen.tsx`, `BrowseScreen.tsx`, or `playlistListPrefs.ts`.
- Do not edit `packages/ui`, `packages/helpers-requests`, the API, the migration, or the web form.
- Do not add a tag filter to Library playlists.
- Do not show tags on the playlist detail screen. That is area I.
- Do not add a SQLite migration. An older `payload_json` without `tags` still parses, and edit refreshes from the server before showing the form.
