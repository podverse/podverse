**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Public playlist tag filter

Global on `/playlists` and Browse playlists get one tag filter. My Playlists and Subscribed do not. `NEXT_PUBLIC_PLAYLISTS_DEFAULT_TAG` is the opening tag on `/playlists` only. It is blank by default. The visitor can change or clear it. A saved choice and an explicit `tag` URL still win.

## Rows

R12, R13, R16, R18

## Runs after

10, 12, 13, 20, 60

Plan 10 supplies `normalizePlaylistTagName` and `PLAYLIST_TAG_NAME_MAX_LENGTH`. Plan 12 supplies `reqPlaylistTagSearch`. Plan 13 puts optional `tag` on `QueryParamsPlaylists` and forwards it only for public lists. Plan 20 supplies `AutocompleteDropdown`. Plan 60 owns the type and medium opening this plan extends. Do not edit those plans' request helpers, query param types, or `packages/ui`.

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue. This planning step did not run `gh`.

## Decisions

- The tag env follows the same split as sort and range. `NEXT_PUBLIC_PLAYLISTS_DEFAULT_TAG` applies to `/playlists` only. Browse playlists (`browse-playlists`) uses the URL, then that list's cookie, then no tag. It does not read the playlists-page env.
- The control is on screen only when `filterParams.type === 'public'`. That is Global on `/playlists` and the whole Browse playlists list. My Playlists and Subscribed render no control. Profile playlist lists are a different page and stay unchanged.
- The control is a filter chip plus `AutocompleteDropdown` from `@podverse/ui`. It is not `TagField`. One applied tag, not a list of chips.
- A missing `tag` key on a saved playlist filter is no saved choice, so the env can apply. A stored `null` or `""` is a saved clear and beats the env. The first visit persists the resolved tag, including null, the same way the first visit persists the resolved sort.
- An explicit URL wins and is then what gets saved. This page does not write filters into the URL. Clearing the chip updates the cookie and the list. A reload of a URL that still has `tag` applies that URL again.
- `?tag=` or a whitespace-only `tag` is an explicit clear. A value `normalizePlaylistTagName` rejects as `too_long` is ignored and the cookie, then the env, still apply. The page must not send a too-long tag (the API answers 400).
- Enter applies the folded typed text even when it is not in the suggestion list. An unknown name is an empty page, which plan 13 already returns. Blur does not apply a tag. Escape closes the editor and leaves the applied tag as it was.
- The music-existence probe does not send `tag`. The visitor's own list request does, and only when the type is public and the folded tag is non-empty. Omit the property otherwise. Do not send `tag=` or `tag=null`.
- The applied value stored in state and in the cookie is the folded name.

## Tag on the opening

Extend plan 60's parser in `packages/helpers/src/lib/playlistsPageDefaults.ts`. Add `'playlistsTag'` to `PlaylistsPageDefaultField`, `tag: string | null` on `PlaylistsPageDefaults` and `PlaylistsPagePublicOpening`, and optional `tag?: string` on `PlaylistsPageDefaultEnv`.

Parse with `normalizePlaylistTagName` from `./playlistTag.js`:

- Undefined or trim-empty: null, no issue.
- `ok`: store `name` (folded). `playlistsPublicOpening` copies that string.
- `too_long`: push `{ field: 'playlistsTag', raw: trimmed }` and store null.

`apps/web/src/config/index.ts` passes `tag: env.NEXT_PUBLIC_PLAYLISTS_DEFAULT_TAG` with no default operator.

Add `NEXT_PUBLIC_PLAYLISTS_DEFAULT_TAG` immediately after `NEXT_PUBLIC_PLAYLISTS_DEFAULT_MEDIUM` in:

- `apps/web/src/config/runtime-config.ts` (union and `optional`)
- `apps/web/sidecar/src/server.ts` (`optionalKeys`, `PLAYLISTS_PAGE_ENV_FIELDS` field `'tag'`, `getCategory` `Lists`)

In `validatePlaylistsPageDefault`, a tag issue says the value must be at most `PLAYLIST_TAG_NAME_MAX_LENGTH` characters. A foldable name is valid. Blank stays Skipped. Do not treat tag as a sort or a range.

Env files, next to the type and medium keys. Do not edit `apps/web/sidecar/.env`.

`.env.example`:

```
# Blank opens /playlists with no tag. A tag name is the opening tag on that page only. Browse playlists ignores this.
NEXT_PUBLIC_PLAYLISTS_DEFAULT_TAG=
```

K8s, unquoted, its own comment line:

```
# NEXT_PUBLIC_PLAYLISTS_DEFAULT_TAG: blank opens /playlists with no tag. Browse playlists ignores this.
NEXT_PUBLIC_PLAYLISTS_DEFAULT_TAG=
```

`apps/web/ENV.md` Playlists section: add this var. Empty by default. A saved choice and `?tag=` still win. The visitor can change or clear it. Browse playlists does not read it. It does not lock the list.

Update plan 60's parser tests so every fixture includes `tag: null`. Add a blank tag, `"  Adam   Curry "` stored as `"adam curry"`, and a 51-character value as issue `playlistsTag` and null.

## Resolver

Extend `resolvePlaylistsPageFilters` in `apps/web/src/app/playlists/resolvePlaylistsPageFilters.ts`. Add:

- `url.tag: string | undefined` — undefined means the param is absent. `""` means it is present and empty.
- `useEnvTag: boolean` — true on `/playlists`, false on browse.
- Return the plan 60 fields plus `tag: string | null`.

`??` is wrong for tag, because null means a saved clear. Resolve in this order:

1. URL present and trim-empty: null.
2. URL present and `normalizePlaylistTagName` is `ok`: that name.
3. URL present and `too_long`: fall through.
4. Cookie object has a `tag` key: null or `""` is null. A string that folds is that name. A string that does not fold falls through.
5. Cookie missing, or no `tag` key: `opening.tag` when `useEnvTag` is true, otherwise null.

Add `playlistQueryTag(type, tag)` in the same file. It returns the folded string only when `type === 'public'` and `tag` is a non-empty string. Otherwise it returns `undefined`. Callers omit the property when the result is `undefined`.

`page.tsx` passes `url.tag` from a successful parse and `undefined` from a failed parse, and `useEnvTag: true`. Put `tag` on `initialQueryParams`.

`searchParamsSchema` in `playlistsListSsr.ts` gains `tag: z.string().optional()` with no default, so a missing param stays undefined.

`resolveBrowseParams` reads `tag` with `firstMediaListSearchParam(searchParams, 'tag')` and calls the resolver with `useEnvTag: false`. Browse type stays public. Do not read `public.playlistsPage` for browse sort, range, medium, or tag. `loadPlaylistsBrowseProps` puts the resolved tag on `initialQueryParams` and on the `loadPlaylistsList` request.

`loadPlaylistsList` takes `tag: string | null` on its params. The visitor request includes `playlistQueryTag`. The music probe (`medium: 'music'`, page 1, used only to decide whether the medium chip lists Music) does not.

`PlaylistsPageContext.tsx` does the same on every `reqPlaylistGetMany` that loads the list the visitor is looking at, including the empty-Music fallback to All. The music probe omits `tag`. `filterParams` already drives the effect.

## Cookie

`PlaylistsFilterDefaults` in `apps/web/src/utils/localSettings/localSettings.ts` gains optional `tag?: string | null`. Absent means an older cookie. Null means cleared.

`PERSISTED_PARAMS` in `apps/web/src/hooks/useFilterDefaults.ts` gains `'tag'`. Other lists have no `tag` field, so their comparison stays equal.

In `apps/web/src/components/MediaListChips/resolvePendingMediaListChrome.ts`, both `updateFilterDefaults` calls under `filterPage === 'browse-playlists'` include `tag: stored?.tag ?? null`. A sort or medium change must not drop a saved browse tag. Do not add `tag` to the other lists' writes.

Keep the tag on `filterParams` when `handleTypeChange` switches to My Playlists or Subscribed. The request omits it. Switching back to Global still has it. Do not set tag to null on a type change.

## Control

Add `apps/web/src/app/playlists/PlaylistTagFilter.tsx` and `PlaylistTagFilter.module.scss`. `'use client'`. The scss import is last. Named export `PlaylistTagFilter`.

Render it from `PlaylistsPageChipRow.tsx` inside `trailing`, before the medium `MenuChip`, only when `filterParams.type === 'public'`. Browse and `/playlists` both use this row. `data-testid="playlists-tag-filter"` on the wrapper.

Closed face: `Chip` from `@podverse/ui`, `variant="filter"`, `selected` only when a tag is applied. Do not set `menuExpanded` (that marks a menu). Set `aria-expanded` to the editor state. Visible text is the folded tag, or the label `Tag` when none. Accessible name is `Tag: {name}` when applied and `Tag` when not, from the catalog keys below.

Clear: `IconButton` `appearance="ghost"` `htmlButtonType="button"`, `FaXmark` from `react-icons/fa6` with `aria-hidden`, accessible name `Clear Tag`. Show it only when a tag is applied. `onClick` sets the tag to null, sets page to 1, and does not toggle the editor. `stopPropagation` so the chip does not open.

Open editor: a `position: absolute` panel, `width: 16rem`, under the chip (`top: 100%`, `left: 0`), so the chip row does not grow. Mount `AutocompleteDropdown` with `autoFocus`, `maxLength={PLAYLIST_TAG_NAME_MAX_LENGTH}`, `inputLabel` `Tag`, no `eyebrow`. Placeholder `Type a tag`. `listLabel` `Tag Suggestions`. `clearQueryLabel` `Clear Tag Text`. The dropdown's clear empties the query. It does not clear the applied filter.

`search` calls `getApiRequestService().reqPlaylistTagSearch` and maps `data` (string array from plan 12) to `{ id, label, value }` all set to that string. Do not debounce again. Pass no `onSearchError` body that toasts or logs. Do not pass `onBlur`.

`onSelect` and `onEnter` fold with `normalizePlaylistTagName`. On `ok`, `setFilterParams({ ...filterParams, tag: name, page: 1 })` and close. On failure, leave the applied tag and keep the editor open. Query state starts as the applied tag when the editor opens, and `''` when none is applied.

A document `pointerdown` outside the wrapper closes the editor without applying. Escape closes the editor without applying. The dropdown already closes its own list on Escape while that list is open; the wrapper handles Escape when the list is not open.

No second argument to CSS `var()`. No new design token. Do not edit `packages/ui`.

## Catalog

Insert `filters.playlist_tag` in `packages/i18n-catalog/consumer/originals/{en-US,es,fr,el-GR}.json`, after `filters.range` and before `filters.list`. Search that key and insert beside it. Do not rewrite the file. Do not edit `overrides/` by hand. Do not edit `apps/web/i18n/compiled/`. Run `npm run i18n:compile` so empty override slots and the gitignored app catalogs pick up the keys.

English:

- `label`: `Tag`
- `placeholder`: `Type a tag`
- `suggestions`: `Tag Suggestions`
- `clear_text`: `Clear Tag Text`
- `clear`: `Clear Tag`
- `selected`: `Tag: {name}`

Spanish:

- `label`: `Etiqueta`
- `placeholder`: `Escribe una etiqueta`
- `suggestions`: `Sugerencias de etiquetas`
- `clear_text`: `Borrar texto de la etiqueta`
- `clear`: `Quitar etiqueta`
- `selected`: `Etiqueta: {name}`

French:

- `label`: `Étiquette`
- `placeholder`: `Saisir une étiquette`
- `suggestions`: `Suggestions d'étiquettes`
- `clear_text`: `Effacer le texte de l'étiquette`
- `clear`: `Retirer l'étiquette`
- `selected`: `Étiquette : {name}`

Greek:

- `label`: `Ετικέτα`
- `placeholder`: `Πληκτρολογήστε μια ετικέτα`
- `suggestions`: `Προτάσεις ετικετών`
- `clear_text`: `Εκκαθάριση κειμένου ετικέτας`
- `clear`: `Αφαίρεση ετικέτας`
- `selected`: `Ετικέτα: {name}`

These keys are the filter. Create and edit use their own keys. Do not reuse `filters.playlist_tag` for the form.

## Leave unchanged

- `packages/helpers-requests/src/api/queryParams.ts` and `packages/helpers-requests/src/api/playlist/playlist.ts`
- `packages/ui`
- Playlist create and edit, `ListPlaylistRow`, mobile screens
- `apps/web/src/utils/mediaListChips.ts` (Browse already mounts `PlaylistsPageChipRow`)
- `apps/web/e2e/playlists-profiles-chips.spec.ts` and `apps/web/e2e/media-list-chips.spec.ts`. Their Filter and Sort assertions must keep passing. The new control is an extra button. It uses a listbox, not a menu, and it is closed on load.

## Files

- packages/helpers/src/lib/playlistsPageDefaults.ts
- packages/helpers/src/lib/playlistsPageDefaults.test.ts
- apps/web/src/app/playlists/resolvePlaylistsPageFilters.ts
- apps/web/src/app/playlists/resolvePlaylistsPageFilters.test.ts
- apps/web/src/app/playlists/page.tsx
- apps/web/src/app/playlists/playlistsListSsr.ts
- apps/web/src/app/playlists/PlaylistsPageContext.tsx
- apps/web/src/app/playlists/PlaylistsPageChipRow.tsx
- apps/web/src/app/playlists/PlaylistTagFilter.tsx
- apps/web/src/app/playlists/PlaylistTagFilter.module.scss
- apps/web/src/utils/localSettings/localSettings.ts
- apps/web/src/hooks/useFilterDefaults.ts
- apps/web/src/components/MediaListChips/resolvePendingMediaListChrome.ts
- apps/web/src/config/index.ts
- apps/web/src/config/runtime-config.ts
- apps/web/sidecar/src/server.ts
- apps/web/sidecar/.env.example
- apps/web/ENV.md
- infra/k8s/base/web/source/web-sidecar.env
- packages/i18n-catalog/consumer/originals/en-US.json
- packages/i18n-catalog/consumer/originals/es.json
- packages/i18n-catalog/consumer/originals/fr.json
- packages/i18n-catalog/consumer/originals/el-GR.json
- apps/web/e2e/playlists-tag-filter.spec.ts

## Tests

Extend `playlistsPageDefaults.test.ts` as listed under Tag on the opening.

Extend `resolvePlaylistsPageFilters.test.ts`. Keep the plan 60 cases; give them `useEnvTag: true` and `url.tag: undefined`, and expect `tag: null` unless the opening tag is set. Add:

- URL `Adam Curry` beats a cookie tag and the env, and the result is `adam curry`.
- URL `""` beats a cookie tag and the env, and the result is null.
- A 51-character URL falls through to the cookie.
- Cookie `tag: null` beats the env.
- A cookie with no `tag` key uses the env when `useEnvTag` is true, and null when it is false.
- `playlistQueryTag('private', 'news')` and `playlistQueryTag('public', null)` are `undefined`. `playlistQueryTag('public', 'news')` is `news`.

Playwright spec `apps/web/e2e/playlists-tag-filter.spec.ts`. Suite title `Public playlist tag filter`. Verbose test sentences. After each `goto`, assert the URL and a visible destination element. `capturePageLoad` from `e2e/helpers/stepScreenshots.ts`, and pass the tag control as `scrollToElement` when that step checks it. No `test.setTimeout`. No assertion that accepts two outcomes. Do not seed tags and do not assert list rows.

- Signed-out `/playlists` shows a button named `Tag` inside `playlists-tag-filter`. The URL stays `/playlists`.
- `/playlists?tag=Adam%20Curry` shows a button named `Tag: adam curry`. The URL still has that query. Activating `Clear Tag` changes the button name to `Tag` and leaves the query in the URL.
- On `/playlists`, My Playlists hides `playlists-tag-filter` and the sort chip reads `Sort: A-Z`. Subscribed also hides it. Global shows it again.
- `/browse?tab=playlists` shows the tag control and still shows `Filter: All` and `Sort: Recent`. `/browse?tab=playlists&tag=news` names the button `Tag: news` and keeps `tab=playlists`.

No API integration test. No Maestro flow. No component unit test. The dropdown's own tests are plan 20.

## Release scratchpad

```markdown
## Public playlist lists can filter by tag

- Surfaces: web
- Change: Global on `/playlists` and Browse playlists show a tag filter the visitor can change or clear. My Playlists and Subscribed do not. `NEXT_PUBLIC_PLAYLISTS_DEFAULT_TAG` is the opening tag on `/playlists` only and is blank by default. A saved choice and an explicit `?tag=` still win. Browse playlists does not read that env.
- Who notices: visitors on the public playlist lists, and operators who set the tag env
- Operator steps: set `NEXT_PUBLIC_PLAYLISTS_DEFAULT_TAG` on the web sidecar to a tag name, or leave it blank
```
