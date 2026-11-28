**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Web playlist create and edit tags

The web create and edit forms gain the tag field from plan 21. The owner can add, replace, and remove tags up to the configured count. Enter adds the typed name as a chip. Submit also commits text still in the box. Blur does not add a chip. There is no create row. Saving the playlist is what stores the name. Search uses plan 12. The count and the character cap come from `useConfig().public.playlistLimits` (plan 101). This plan is the web half of the same behavior the phone form does.

## Rows

R1, R2, R3, R4, R6, R15, R31, R33, R34, R35, R36

R3 is the web half only. The phone form covers its half. R33–R36 are the same commit, cap, field order, and search-failure behavior on both forms.

## Runs after

10, 11, 12, 21, 101

## Files

- apps/web/src/components/Playlist/PlaylistForm.tsx
- apps/web/src/app/playlist/create/PlaylistCreatePageContext.tsx
- apps/web/src/app/playlist/create/PlaylistCreatePageForm.tsx
- apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditPageContext.tsx
- apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditPageForm.tsx
- packages/i18n-catalog/consumer/originals/en-US.json
- packages/i18n-catalog/consumer/originals/es.json
- packages/i18n-catalog/consumer/originals/fr.json
- packages/i18n-catalog/consumer/originals/el-GR.json
- apps/web/e2e/playlist-tags.spec.ts
- makefiles/local/e2e-spec-order-web.txt

## Tests

Playwright spec `apps/web/e2e/playlist-tags.spec.ts`. No new unit test and no API test. The cap, the fold, and the suggestion list are already tested in plans 10, 12, and 21. This plan only wires them. The web unit-test gate exception is that wiring: no new auth or persistence branch lives in the form.

Insert the spec in `makefiles/local/e2e-spec-order-web.txt` on the line after `apps/web/e2e/playlist-edit-play.spec.ts`.

CRUD matrix for this form:

- Create: covered (new tag, and a playlist with no tags).
- Read: covered on the edit form after a full reload. Do not assert tags on `/playlist/[playlist_id]` or on a list row. Those are areas I and H.
- Update: covered (replace the list, and save an empty list).
- Delete: deferred. Removing a tag is the update path. The existing Delete Playlist button is unchanged, and this spec does not click it.
- Show/hide: covered (the text field hides at the configured count, the limit sentence is visible, and the field returns after a remove).
- Enable/disable: covered (Submit stays disabled while the title is empty, with or without tags).
- Validation: the text field stops at the configured character cap and the field hides at the configured count. Assert the count sentence. Do not assert a character-cap sentence. Do not assert a server error string.
- Empty: covered (create with a title and no tags).
- Membership: unchanged. Do not edit `apps/web/e2e/membership-gating.spec.ts`. A Trial member's create still posts `/playlist` and still opens the membership modal.

Follow **e2e-readability** and **e2e-screenshot-verified-element**. Suite title: `Playlist tags`. Each test title is a full sentence. After every navigation, assert the URL and one heading or field on that page. Pass the asserted element to `capturePageLoad` or `actionAndCapture`. Do not raise timeouts. Copy `loginSeedUser` from `apps/web/e2e/playlist-edit-play.spec.ts` into this spec (same URL, `e2e-user@example.com`, `Test!1Aa`). Do not add a shared login module.

Build each tag from `Date.now().toString(36)` so a parallel worker does not share a prefix. Keep an uppercase letter in the typed text when the assertion is "the form kept the typed casing".

The combobox accessible name is `Tags` (`getByRole('combobox', { name: 'Tags' })`). A suggestion is `getByRole('option', { name: <stored name>, exact: true })`. A remove control is `getByRole('button', { name: 'Remove <tag text>', exact: true })`. Submit is `getByRole('button', { name: 'Submit', exact: true })`. The sharable-status control's accessible name is the eyebrow plus the current value, `Sharable Status Private` at first. Its menu items are `Public`, `Unlisted`, and `Private`.

1. When the title is empty, Submit is disabled. Filling the title enables it. Tags do not enable it on their own.
2. When a signed-in member types a new tag and presses Enter, the chip uses that typed casing and the URL is still `/playlist/create`. Submit then lands on `/playlist/<id_text>` (assert the playlist title as the `h1`). Open `/playlist/edit/<id_text>` and assert the remove control uses the folded name (lowercase, one space). The chip before Submit and the chip after reload must differ in case.
3. When a signed-in member saves a Public playlist with a tag, then on a second create types a prefix of that stored name and activates that option, the chip is the stored name, not the typed prefix. Submit, open edit, and assert that same stored name. Set Public by opening `Sharable Status Private` and activating the `Public` menu item before the first save. Type a prefix of the folded name (`e2e vis` matches `e2e visible …`). Do not type a middle substring (`visible` does not match). Wait with `toBeVisible` on the option. Do not call `waitForTimeout`.
4. When a signed-in member creates a playlist with no tags, edit shows the combobox and no remove control.
5. When a signed-in member removes the saved tag, adds a different one, and submits, a later visit to edit shows only the new tag.
6. When a signed-in member removes every tag and submits, a later visit to edit shows the combobox and no remove control.
7. When the form already has 5 tags, the combobox is absent and the text `A playlist has at most 5 tags.` is visible. Removing one brings the combobox back and hides that sentence. Enter each name. There is no create row. Use five distinct names. The test API uses the default count of 5. Do not assert a sentence about 50 characters.
8. When tag search returns HTTP 500, the field shows `Something went wrong. Please try again later, or contact support for assistance.` Type a new name, wait until that sentence is visible, then press Enter. The chip uses the typed name, and the URL is still `/playlist/create`. Fulfill `**/playlist/tag?*` with status 500 for this test only. Wait with `toBeVisible` on that sentence. Do not call `waitForTimeout`.

Do not assert tag chips on the playlist page. Do not assert a list-row tag line.

## Release scratchpad

```markdown
## Playlist tags on web create and edit

- Surfaces: web
- Change: Playlist create and edit can add, change, and remove tags. The count and the character cap come from public config, and are 5 and 50 when that request fails. At the count, the text box hides and a sentence names that count. Typing stops at the character cap. Enter adds the typed name as a chip. Submit also saves text still in the box. A new name is stored only when the playlist is saved. A failed tag search shows the generic error on the field, and Enter and Submit still add the typed name.
- Who notices: people who create or edit playlists on the web
- Operator steps: none
```

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue. `00-REQUEST.md` records that 410 is the open playlist-tag issue. This step did not run `gh` again.

## Decisions

- The tag field is the last field before Cancel and Submit. On this form that is after Description. The other placement was above the title. The primary button stays Submit. Do not rename it.
- Create and edit both send `tags` as the array on screen, including `[]`. An edit clears tags only when the key is present and empty, and the form is showing that empty list, so both saves send the array.
- Enter adds the typed name. Submit also commits text still in the box by calling `commitTagDraft`. Blur does not add a chip. There is no create row. The name is stored only when the playlist save succeeds.
- At the tag limit, hide the box and show a sentence that names the configured count. When that count is 5 the English sentence is `A playlist has at most 5 tags.` Typing stops at the character cap. There is no sentence for that cap.
- A failed search logs with `console.error`, sets `infoError` to the existing generic error, and rethrows. Enter and Submit still add the typed name. There is no toast.

## Reuse

Mount plan 21's `TagField` from `@podverse/ui`. Do not edit `packages/ui`. Do not build a second tag control. Do not render `Chip`.

The form does not call `fetch`. Search goes through `getApiRequestService().reqPlaylistTagSearch` (plan 12). Create and edit already go through `reqPlaylistCreate` and `reqPlaylistEdit` (plan 11 adds optional `tags`).

Read `maxPerPlaylist` and `nameMaxLength` from `useConfig().public.playlistLimits` (plan 101). `useConfig()` returns `ResolvedWebConfig`, which always has that object. On a failed `GET /config` the numbers are 5 and 50. The layout waits for the request, so the first render already has either the API numbers or those two defaults. Do not import the helper constants in the form. Do not add a second fallback. If `public.playlistLimits` is missing, stop and report. Do not write `5` or `50` as a second copy of those limits. Pass the live numbers as `maxCount` and `maxLength`.

Do not debounce. Plan 21's dropdown already waits 450ms.

Strings stay in the catalog. `TagField` receives them as props.

## Leave unchanged

- `packages/ui`, the API, the playlist DTO, and the playlist request helpers
- `apps/web/src/app/playlist/[playlist_id]/` (area I)
- `apps/web/src/app/playlist/create/page.tsx`, `PlaylistCreatePageClient.tsx`, `PlaylistCreatePageHeader.tsx`
- `apps/web/src/app/playlist/edit/[playlist_id]/page.tsx`, `PlaylistEditPageClient.tsx`, `PlaylistEditPageHeader.tsx`, `PlaylistEditPageList.tsx`, `PlaylistEditPageButtonTabs.tsx`
- `apps/web/src/styles/components/Playlist/PlaylistForm.module.scss`
- Delete Playlist, the Items tab, medium, title, description, and sharable status, other than reading sharable status in the spec
- Catalog `overrides/` and every `compiled/` file
- `apps/mobile`

`'use client'` stays on the files that already have it. Extensionless imports. The scss import stays last in `PlaylistForm.tsx`. Named exports only. No `any`. No type assertion. `===` / `!==` only. No comment that cites a plan, a row, or a step.

## Catalog

Search `features.playlist` in each consumer original (the `"playlist"` object that contains `"playlist_type"`). Insert a key immediately before `"login_prompt"` only when that key is absent. Do not rewrite the file. Do not edit `overrides/` or `compiled/`. The phone form plan inserts the same `tags`, `tag_placeholder`, `clear_tag_text`, `remove_tag`, and `tag_limit` strings. If one of those keys is already present with the value below, leave it. If `tag_limit` is present with a hardcoded `5`, replace that value with the `{count}` sentence. If `add_tag` or `tag_too_long` is present, delete that key. Do not add `add_tag`. There is no create row. Do not add a one-tag variant. The sentence uses `tags` for every count, including 1.

After the four originals, run `npm run i18n:compile` from the repo root. Compiled catalogs are gitignored.

`en-US.json`, English chrome in title case, the placeholder and the limit sentence in sentence case:

```json
"tags": "Tags",
"tag_placeholder": "Type a tag",
"tag_suggestions": "Tag Suggestions",
"clear_tag_text": "Clear Tag Text",
"remove_tag": "Remove {tag}",
"tag_limit": "A playlist has at most {count} tags.",
```

`es.json`:

```json
"tags": "Etiquetas",
"tag_placeholder": "Escribe una etiqueta",
"tag_suggestions": "Sugerencias de etiquetas",
"clear_tag_text": "Borrar el texto de la etiqueta",
"remove_tag": "Quitar {tag}",
"tag_limit": "Una lista de reproducción tiene como máximo {count} etiquetas.",
```

`fr.json`:

```json
"tags": "Étiquettes",
"tag_placeholder": "Saisissez une étiquette",
"tag_suggestions": "Suggestions d'étiquettes",
"clear_tag_text": "Effacer le texte de l'étiquette",
"remove_tag": "Retirer {tag}",
"tag_limit": "Une playlist a au plus {count} étiquettes.",
```

`el-GR.json`:

```json
"tags": "Ετικέτες",
"tag_placeholder": "Πληκτρολογήστε μια ετικέτα",
"tag_suggestions": "Προτάσεις ετικετών",
"clear_tag_text": "Εκκαθάριση κειμένου ετικέτας",
"remove_tag": "Αφαίρεση {tag}",
"tag_limit": "Μια λίστα αναπαραγωγής έχει το πολύ {count} ετικέτες.",
```

Keep the `{tag}` and `{count}` placeholders spelled the same in every locale. Eyebrow `tags` and placeholder `tag_placeholder` are different strings. Do not pass `misc.optional` as this placeholder. The search failure reuses `errors.generic`. Do not add a second sentence for it. English is `Something went wrong. Please try again later, or contact support for assistance.`

Call sites, with `useTranslations('features')` as `tFeatures`:

- `eyebrow={tFeatures('playlist.tags')}`
- `placeholder={tFeatures('playlist.tag_placeholder')}`
- `listLabel: tFeatures('playlist.tag_suggestions')`
- `clearQueryLabel: tFeatures('playlist.clear_tag_text')`
- `removeLabel: (tag) => tFeatures('playlist.remove_tag', { tag })`
- `limitMessage={tFeatures('playlist.tag_limit', { count: maxPerPlaylist })}`
- `infoError` is `useTranslations('errors')` then `t('generic')` while the search-failed flag is set, and `undefined` otherwise. Do not pass `createLabel`.

## Form state

Add `tags: string[]` and `setTags` to both page contexts.

- Create starts at `[]`.
- Edit starts at `ssrPlaylist.tags ?? []`. A missing key means there are no tags to show. Do not treat a missing key as an error. `DTOPlaylist.tags` is optional after plan 11.

The edit form returns `null` when the Items tab is selected. Keep the tag array in the edit context so it survives that unmount. The ref below is recreated when the info form mounts again, initialized from that context value.

In `PlaylistCreatePageForm` and `PlaylistEditPageForm`, next to the existing submit handler:

```tsx
const [draft, setDraft] = useState('');
const tagsRef = useRef(tags);
const draftRef = useRef('');

const setTagsFromField = (next: readonly string[]) => {
  tagsRef.current = [...next];
  setTags([...next]);
};

const setDraftFromField = (next: string) => {
  draftRef.current = next;
  setDraft(next);
};
```

`useRef(tags)` runs on the first render of that form instance. Do not also copy context state into the ref from an effect. `setTagsFromField` and `setDraftFromField` are the writers. Submit reads the refs, because a keystroke's `setState` may not have rendered yet. `draft` state is what `TagField` displays.

Submit calls `commitTagDraft` from `@podverse/ui` with `tagsRef.current`, `draftRef.current`, and `useConfig().public.playlistLimits`. Then it sets `tagsRef` and `setTags` from `result.tags`. When `status` is `added`, `duplicate`, or `empty`, set the draft ref and the draft state to `''`. When `status` is `at-max` or `too-long`, leave the draft and do not set an error. Send `result.tags`, not the `tags` state variable. Blur does not add a chip, so the click must not depend on blur.

Pass `tags`, `setTagsFromField`, `draft`, and `setDraftFromField` into `PlaylistForm`.

## What the form renders

In `PlaylistForm`, after the description `FormTextArea` and before the `.buttons` div, render `TagField`. That is the last field before Cancel and Submit. Do not place it above Description, above the title, or after the buttons.

```tsx
<TagField
  id="playlist_tags"
  eyebrow={tFeatures('playlist.tags')}
  placeholder={tFeatures('playlist.tag_placeholder')}
  value={tags}
  onChange={setTags}
  draft={draft}
  onDraftChange={setDraft}
  search={searchPlaylistTags}
  maxCount={limits.maxPerPlaylist}
  maxLength={limits.nameMaxLength}
  limitMessage={tFeatures('playlist.tag_limit', { count: limits.maxPerPlaylist })}
  infoError={tagSearchFailed ? tErrors('generic') : undefined}
  disabled={isUpdating}
  labels={{
    listLabel: tFeatures('playlist.tag_suggestions'),
    clearQueryLabel: tFeatures('playlist.clear_tag_text'),
    removeLabel: (tag) => tFeatures('playlist.remove_tag', { tag }),
  }}
/>
```

`limits` is `useConfig().public.playlistLimits`. `tErrors` is `useTranslations('errors')`. `TagField` is one sibling in `StackForm`. Do not add a margin on it. The stack gap is the space.

Do not pass `readOnly`, `autoFocus`, or `info`. Title keeps `autoFocus`. Do not pass a character-cap sentence.

`searchPlaylistTags` lives in `PlaylistForm`, which already constructs `getApiRequestService()`:

```tsx
const searchPlaylistTags = async (query: string): Promise<readonly string[]> => {
  try {
    const response = await getApiRequestService().reqPlaylistTagSearch(query);
    setTagSearchFailed(false);
    return response.data;
  } catch (error) {
    console.error('Playlist tag search failed', error);
    setTagSearchFailed(true);
    throw error;
  }
};
```

Clear `tagSearchFailed` when the draft becomes `''`. A failed search does not block Enter or Submit. `TagField` rethrows into the dropdown, which closes the list, so Enter adds the typed name.

`reqPlaylistTagSearch` returns `{ data: string[] }`. The array is the stored names. Do not map, trim, or fold them here. A private playlist's tags are absent from this route. That is plan 12. Do not add a second search for names that exist only on private playlists. The edit form still shows the owner's own tags from `ssrPlaylist.tags`.

Add `tags`, `setTags: (next: readonly string[]) => void`, `draft: string`, and `setDraft: (next: string) => void` to `PlaylistFormProps`. `tagSearchFailed` stays in `PlaylistForm`.

## Save

`isValidSubmit` stays `!isUpdating && title.trim().length > 0`. Tags are optional. An empty title with tags still cannot submit.

Create, inside the existing `reqPlaylistCreate` object, add `tags: [...committed]`, where `committed` is `commitTagDraft(...).tags` from the start of the handler. Keep title, description, medium, and `sharable_status_id` as they are.

Edit, inside the existing `reqPlaylistEdit` object, add `tags: [...committed]`. Always include the key, including when the array is empty. Omitting it would leave the previous tags in place (plan 11).

Do not fold or drop blanks before send. `commitTagDraft` trims. Plan 11 folds on the server. The chip shows the typed casing until the next load, which shows the folded name. Selecting a suggestion uses the string the search returned, which is the stored name. Do not lowercase the chip in the form. Do not block Submit when the search failed or when the draft is longer than the cap. The input already stops at the cap. A `too-long` result sends the chips without that draft and shows no extra sentence.

Do not insert a tag on any request other than this create or this edit. Typing may call `GET /playlist/tag`. That route does not insert a row.

After a successful save, keep the existing `router.push(`/playlist/${playlist.id_text}`)`. Do not add tags to that page in this plan.

`disabled={isUpdating}` on `TagField` is the only new loading behavior. Leave the Submit `isLoading` as it is.

A non-owner still cannot update. `verifyPlaylistOwnership` returns 403 before tags are written. Do not add a client-side owner check. Signed-out create still fails at the API as it does today. Membership errors still go through `tryHandleMembershipGateError` first. Any other error is still rethrown. Do not add a toast.
