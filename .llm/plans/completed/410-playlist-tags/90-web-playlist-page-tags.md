**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Tag chips on the web playlist page

The playlist page lists a playlist's tags under its description. The chips are the read-only tag control. An empty list adds nothing to the header.

## Rows

R27

## Runs after

11, 21

Plan 11 puts `tags` on the playlist detail payload. Plan 21 exports `TagField`. This plan does not add the field, the search route, or the control.

## Files

- apps/web/src/app/playlist/[playlist_id]/PlaylistPageHeaderInfo.tsx
- apps/web/src/styles/app/playlist/PlaylistHeaderInfo.module.scss
- tools/web/embed-fixture-constants.mjs
- tools/web/seed-embed-fixtures.mjs
- apps/web/e2e/helpers/seedConstants.ts
- apps/web/e2e/playlist-page-tags.spec.ts
- makefiles/local/e2e-spec-order-web.txt

## Tests

New Playwright spec `apps/web/e2e/playlist-page-tags.spec.ts`. No unit test and no API integration test. The page only renders strings the detail payload already has. No Maestro flow.

Suite title: `Playlist page tags`.

Two tests, each one outcome:

- When a signed-out visitor opens `/playlist/e2eEmbPlList01`, the URL matches that path, the heading `Playlist (audio)` is visible, and `playlist-page-tags` shows two list items in order: `adam curry`, then `podcasting`. That element contains no button. `capturePageLoad` scrolls to `playlist-page-tags`.
- When a signed-out visitor opens `/playlist/e2eEmbPlMix01`, the URL matches that path, the heading `Playlist (mixed)` is visible, and `playlist-page-tags` is absent.

Use `buildPlaylistPath` from `@podverse/helpers`. Import the id texts and the two tag strings from `apps/web/e2e/helpers/seedConstants.ts`. Follow **e2e-readability** and **e2e-screenshot-verified-element**. Do not raise the timeout.

Insert `apps/web/e2e/playlist-page-tags.spec.ts` in `makefiles/local/e2e-spec-order-web.txt` immediately after `apps/web/e2e/playlist-and-edit-route-not-found.spec.ts`.

## Release scratchpad

```markdown
## Playlist page shows its tags

- Surfaces: web
- Change: The playlist page lists a playlist's tags as chips under the description. The chips show the stored names in the owner's order. A playlist with no tags keeps the header it has today. The chips are not buttons, and they do not filter a list. The embed player does not list them.
- Who notices: anyone who opens a playlist that has tags
- Operator steps: none
```

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue. `00-REQUEST.md` records that 410 is the open playlist-tag issue. This step did not run `gh`.

## Decisions

- Chips go on the web playlist page (`/playlist/[playlist_id]`), which is the page R27 names. The embed player does not get them. `apps/web/src/app/embed/playlist/[playlist_id]/page.tsx` renders `EmbedTypedRoutePage`, and the list layout is `EmbedListShell`: a player panel plus item rows. It does not render `PlaylistPageHeader`. Adding chips there would be a new player layout.
- The chips are labels. They do not link to `/playlists` and they do not set a tag filter. `TagField` in read-only mode is not a button.
- No eyebrow. Plan 21's screen contract for this page is `<TagField readOnly value={tags} />`. A "Tags" heading is a second label the request does not ask for. The chip text is the accessible name.
- The phone detail screen is plan 91, not this plan.

## Where the chips go

`PlaylistPageHeader` already renders `PlaylistPageHeaderInfo` inside `.textSection`. Leave `PlaylistPageHeader.tsx` unchanged.

In `PlaylistPageHeaderInfo`, after the description `div`, render the chips when `playlist.tags` is an array with length greater than 0. A missing `tags` key and an empty array both render nothing. Do not sort, fold, or drop names here. Plan 11 already sends folded names in the owner's order.

```tsx
<TagField id="playlist-page-tags" readOnly value={playlist.tags} />
```

Import `TagField` from `@podverse/ui`. Pass no `eyebrow`, `labels`, `search`, `onChange`, `placeholder`, or `maxCount`. Read-only mode ignores those and does not throw when they are omitted.

Wrap that element in a `div` with `className={styles.tags}` and `data-testid="playlist-page-tags"`. The wrapper mounts only for a non-empty array, so an empty header does not keep a margin. `TagField` also returns nothing for an empty read-only value; the wrapper is what the spec finds.

`.tags` uses the same `margin-top` as `.description` in `PlaylistHeaderInfo.module.scss`, including the small-screen rule (`0.375rem`). Do not change `.creator`, `.info`, `.description`, or `PlaylistHeader.module.scss`.

The page already loads the playlist with `getPlaylistForSeoPage` → `reqPlaylistGet`. `PlaylistPageClient` passes that object into the header. Do not add a second fetch.

## Seed

Tag the existing public embed playlist only. Its `id_text` is `e2eEmbPlList01`, title `Playlist (audio)`, `sharable_status_id` 1 (`SharableStatusEnum.Public`). Leave its title, description, medium, resources, and status as they are. Do not tag `e2eEmbPlMix01` (`Playlist (mixed)`) or `e2eEmbPlPriv01`.

In `tools/web/embed-fixture-constants.mjs`, next to `EMBED_FIXTURE_PLAYLIST_ID_TEXT`, add:

- `EMBED_FIXTURE_PLAYLIST_TAG_ADAM` = `adam curry`
- `EMBED_FIXTURE_PLAYLIST_TAG_PODCASTING` = `podcasting`

In `tools/web/seed-embed-fixtures.mjs`, after `publicPlaylistId` is set and before the `playlist_resource` insert for that playlist, insert the two catalog rows and the two assignments. Use the constants as query parameters. `list_position` 1 is `adam curry`. `list_position` 2 is `podcasting`.

```sql
INSERT INTO playlist_tag (name) VALUES ($1) ON CONFLICT (name) DO NOTHING
```

```sql
INSERT INTO playlist_tag_assignment (playlist_id, playlist_tag_id, list_position)
SELECT $1, id, $2 FROM playlist_tag WHERE name = $3
```

The seed already deletes those playlists before insert. Assignment rows cascade, and the unused-name trigger removes a catalog row that no playlist still uses. `ON CONFLICT` covers a name that another fixture still holds. Do not edit the migration. Do not add `ON CONFLICT` to SQL under `linear-migrations/`.

Copy the same two strings into `apps/web/e2e/helpers/seedConstants.ts` beside `E2E_EMBED_PLAYLIST_ID_TEXT`, with a comment that they stay in sync with `embed-fixture-constants.mjs`:

- `E2E_EMBED_PLAYLIST_TAG_ADAM`
- `E2E_EMBED_PLAYLIST_TAG_PODCASTING`

`browse.yaml` still finds `my-profile-playlist-row-e2eEmbPlList01` and its subtitle. Do not change that flow. Do not change the playlist title.

## Leave unchanged

- `PlaylistPageHeader.tsx`, the embed route, `EmbedListShell`, and `EmbedPlayerPanel`
- `packages/ui`, the API, the playlist form, and `ListPlaylistRow`
- Catalog files. The chip text is the stored tag, not a translated label.
- Create, edit, and the public list filters
