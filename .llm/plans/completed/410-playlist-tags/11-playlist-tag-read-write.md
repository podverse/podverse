**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# Playlist tags on read and write

The playlist owner sets tags by saving the playlist. List and detail payloads include `tags` when the viewer is allowed to see them. A new name is inserted only inside that save. There is still no tag-create route and no list filter.

## Rows

R1, R2, R15, R19, R20, R24, R25, R30, R31, R37

## Runs after

10

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue.

## Decisions

- `DTOPlaylist.tags` is optional (`tags?: string[]`). A stored phone row written before this field still parses. When the viewer may see tags, the API sends the key, and the array may be empty. When the viewer may not, the key is absent. Do not send `[]` for a private playlist the viewer does not own.
- Create and update accept `tags` only from the authenticated owner. Create already requires the account. Update already goes through `verifyPlaylistOwnership`.
- On create, omitted `tags` means no tags. On update, omitted `tags` leaves the rows unchanged. A present array, including `[]`, replaces the playlist's assignments. Joi `stripUnknown` would drop `tags` unless the schema lists it. Add it.
- The request array length is at most the configured `PLAYLIST_TAG_MAX_PER_PLAYLIST`. Each name is at most the configured `PLAYLIST_TAG_NAME_MAX_LENGTH`. Unset or blank env uses the helper constants: 5 tags and 50 characters. The server folds, trims, drops blanks, and keeps the first copy of a repeated name. It does not insert a tag row on any request other than playlist create or update.
- A set character env above `PLAYLIST_TAG_NAME_MAX_LENGTH` (the `varchar_short` width, 50) refuses startup. A set count env may be higher than 5. It must be an integer from 1 through `PLAYLIST_TAG_MAX_PER_PLAYLIST_ENV_CEILING` (32767). An out-of-range or non-integer value refuses startup. Config does not substitute the default for a bad value.
- Both rejection sentences come from plan 10's message helpers and name the configured numbers. With the defaults they are `A playlist has at most 5 tags.` and `A tag is at most 50 characters.`
- Order in the array is `list_position` order. The strings are the folded names from plan 10.
- Private tags stay off payloads for everyone except the owner. Public and unlisted playlists include tags for every caller who already receives that playlist.
- Adding the field does not change which playlists a list returns. Untagged public playlists stay in the public lists.

## DTO

In `packages/helpers/src/dtos/playlist/playlist.ts`, add optional `tags?: string[]` on `DTOPlaylist`. Folded names in the owner's order. The key is absent when the viewer must not see this playlist's tags, and on a stored payload that has no tags yet. Do not add `tags` to `DTOPlaylistLikes` or `PlaylistLikesIndex`.

Do not rename an existing field. Do not make `tags` required.

`packages/helpers-requests/src/api/playlist/playlist.ts`:

- `ReqPlaylistCreateParams` gains optional `tags?: string[]`. `reqPlaylistCreate` already sends `params` as the body. Leave that as it is so an omitted key stays omitted.
- `ReqPlaylistEditParams` gains optional `tags?: string[]`. In the PATCH body, include `tags` only when `params.tags !== undefined`. An omitted key must not be sent as `null` or `[]`.

No new method on `ApiRequestService` in this plan.

## Wire shape

`apps/api/src/lib/playlistApiSerialization.ts` already spreads the object. Keep a `tags` array that is already set. Do not copy a tag entity, an assignment row, or any extra property. When `tags` is `undefined`, leave it off the result. When it is an array, keep it, including `[]`.

Add cases to the `playlistToJson` block in `apps/api/src/lib/accountPlaylistApiSerialization.test.ts` for those two shapes. The existing test that omits `sharable_status` stays.

## Who sees tags

New helper `apps/api/src/lib/playlistTags.ts` (API layer, not ORM). It uses `PlaylistTagService.loadTagNamesByPlaylistIdText` and `resolveSharableStatusId`.

`applyPlaylistTags(playlists, viewerAccountIdText: string | null): Promise<void>`

- Load names for every `id_text` in one call.
- `SharableStatusEnum.Private` and `playlist.account.id_text` is not the viewer: delete `tags` if it was set. Missing `account.id_text` on a private playlist also drops the key.
- Every other playlist, including a private playlist whose `account.id_text` is the viewer, and a playlist whose status is public, unlisted, or unresolved: set `tags` to the loaded array or `[]`.

Call this on the playlist objects before `playlistToJson` / `playlistsToJson`, and before `omitAccountNumericId` is not required for the check because the check uses `account.id_text`, which that helper keeps. Public list rows already keep `id_text`. Add `sharable_status_id: true` to `PUBLIC_PLAYLIST_LIST_SELECT` in `packages/orm/src/services/playlist/publicPlaylistListSelect.ts` so a public list row still resolves status after the partial select.

Viewer argument:

- `getManyPublicRecent` and `getManyPublicTop`: `null`
- Private list methods (`getManyPrivateTop`, `getManyPrivateRecent`, `getManyPrivateOldest`, `getManyPrivateAZ`): the authenticated account `id_text`
- Followed list methods (`getManyFollowedPrivateTop`, `getManyFollowedPrivateRecent`, `getManyFollowedPrivateOldest`, `getManyFollowedPrivateAZ`): the authenticated account `id_text`. Another account's private playlist on that list omits `tags`. A public or unlisted row includes them.
- `getPlaylistById`: `req.user?.id_text` when signed in, otherwise `null`. A private playlist is already 404 for a non-owner before this runs. The owner path includes tags. The public and unlisted path includes tags.
- `createPlaylist` and `updatePlaylist`: the owner `id_text`, after the reload from `loadOwnerPlaylistForResponse`.
- `getAllLikesPrivate`: the owner `id_text`, on the playlist entities before `res.json`. Do not change the likes-membership body.
- `ProfileContentController.getProfilePlaylistsAZ`: the signed-in `id_text` or `null`. That query is already public playlists only.
- `ProfileContentController.getMyProfilePlaylistsAZ`: the authenticated account `id_text`.

Do not change `AccountFollowingPlaylistController`. Do not change clip controllers or clip DTOs.

`playlist.test.ts` mocks `@podverse/orm` and spreads `...actual`. Add `PlaylistTagService` to that mock with `loadTagNamesByPlaylistIdText` returning an empty `Map` and `replaceForPlaylist` as a `vi.fn`. Do the same in any other playlist or profile route test that mocks the ORM module and would otherwise construct the real tag service. Keep the real class in `playlist-tag.integration.test.ts`, `playlist-public-recent.integration.test.ts`, and `api-key-routes-playlists-queue-clips.integration.test.ts`.

## Limits

The env names match the helper constants. Unset or blank means the constant. Parse a present value with `parseOptionalNonNegativeInt` from `@podverse/helpers` (`Number` of the trimmed string, then `Number.isInteger`). A non-blank value that parses to `undefined` is invalid. A parsed integer must fall in the range below.

| Env | Unset | Allowed when set |
| --- | --- | --- |
| `PLAYLIST_TAG_MAX_PER_PLAYLIST` | `5` | integer 1 through `PLAYLIST_TAG_MAX_PER_PLAYLIST_ENV_CEILING` (32767) |
| `PLAYLIST_TAG_NAME_MAX_LENGTH` | `50` | integer 1 through `PLAYLIST_TAG_NAME_MAX_LENGTH` (50) |

`0`, a negative, a fraction, and `abc` fail startup for either key. `8` is a valid count. `51` fails startup for the character key. `50` is valid for the character key. Blank is the default, the same as other optional numeric env.

`apps/api/src/config/index.ts`, on `Config`, add `playlistTags: { maxPerPlaylist: number; nameMaxLength: number }` beside `opmlImport`. Read each env in that file. Unset or blank returns the matching helper constant. A parsed integer inside the allowed range returns that integer. Any other present value throws `Error` naming the variable and the allowed range. Do not map a bad value back to 5 or 50. Startup validation runs before config is used; the throw is the same rule if config is reached with a bad value.

`apps/api/src/lib/startup/validation.ts`, inside `validateAllEnvironmentVariables`, after the OPML import block: two results, category `Playlist tags`. Unset or blank is valid, `isSet` false, message `Use Default (5)` or `Use Default (50)` using the constants. A value inside the table above is valid. Anything else is invalid, so `validateStartupRequirements` throws. Follow the console and logger spy shape in `apps/api/src/test/podverse-test-env-startup.test.ts` when asserting that throw.

Env files, same keys, values 5 and 50, so a checkout that copies the templates starts on the defaults. Empty would also mean those defaults; write the numbers so the files match the code fallback (`env-defaults-match-code`).

- `apps/api/.env.example`: new `Playlist tags` section after the OPML Import section. Double-quoted values. Comment on `PLAYLIST_TAG_MAX_PER_PLAYLIST`: empty uses 5. Comment on `PLAYLIST_TAG_NAME_MAX_LENGTH`: empty uses 50, and startup refuses a value above 50. One variable name per comment line.
- `infra/k8s/base/api/source/api.env`: the same two keys after `OPML_IMPORT_MAX_FEEDS_PER_HOUR`, unquoted `5` and `50`, one variable name per comment line.
- `apps/api/ENV.md`: under Optional Variables, a Playlist tags subsection with both keys, the defaults, the character ceiling of 50, and that the count may be higher than 5 up to 32767.
- `packages/helpers-config/src/podverseTestEnv.ts`: in `apiTestEnvBase`, next to `OPML_IMPORT_MAX_FEEDS_PER_HOUR`, `PLAYLIST_TAG_MAX_PER_PLAYLIST: '5'` and `PLAYLIST_TAG_NAME_MAX_LENGTH: '50'`. Every API profile (`apiVitest`, `apiWebE2e`, `apiMobileE2e`) inherits them.

Do not add these keys to workers, the management API, or web `NEXT_PUBLIC_*` env. Clients keep using the helper constants until the public config plan serves `config.playlistTags`.

## Create and update

In `createPlaylist` and `updatePlaylist` (`apps/api/src/controllers/playlist/playlist.ts`), extend the Joi object. Build it inside the handler so it reads `config.playlistTags`. Do not use the helper constants in the schema. Do not allow `tags: null`.

```typescript
tags: Joi.array()
  .items(
    Joi.string()
      .allow('')
      .max(config.playlistTags.nameMaxLength)
      .messages({
        'string.max': playlistTagNameLengthLimitMessage(config.playlistTags.nameMaxLength),
      })
  )
  .max(config.playlistTags.maxPerPlaylist)
  .messages({
    'array.max': playlistTagCountLimitMessage(config.playlistTags.maxPerPlaylist),
  })
  .optional(),
```

Import `config` from `@api/config/index.js`. Import the two message helpers and `normalizePlaylistTagList` from `@podverse/helpers`.

`validateBodyObject` returns Joi's first message as `{ message }` with status 400. The two `.messages` entries are that body. With the defaults, a sixth item returns `A playlist has at most 5 tags.` and a 51-character string returns `A tag is at most 50 characters.`

After Joi, `normalizePlaylistTagList(rawTags, { maxCount: config.playlistTags.maxPerPlaylist, maxLength: config.playlistTags.nameMaxLength })`. On `too_many` or `too_long`, respond 400 with the same helper sentence for that reason. Keep the helper check anyway.

Create: when `tags` is present, `playlistTagService.replaceForPlaylist(created.id, rawTags, { maxCount: config.playlistTags.maxPerPlaylist, maxLength: config.playlistTags.nameMaxLength })` after `playlistService.create` returns. When `tags` is absent, do not call replace. Then reload and `applyPlaylistTags`.

Update: when the body has the `tags` key, call `replaceForPlaylist` with that same limits object and the playlist's numeric id (load it from the ownership row or from `playlistService.getByIdText` if the update return has no id). When the key is absent, do not call replace. Then reload and `applyPlaylistTags`.

`replaceForPlaylist` folds again. Pass the raw strings from the body.

A non-owner still gets 403 from `verifyPlaylistOwnership` and never reaches replace. A signed-out create still gets 401. API key access stays `playlists` `create` and `playlists` `update`. Do not add a new permission.

Default likes playlists are not given tags by this path. Leave `getOrCreateDefaultLikesPlaylist` unchanged.

## OpenAPI

`apps/api/openapi.yml` is large. Search the anchors. Do not page the file.

- `components/schemas/Playlist` (about line 5593): add `tags`, an array of strings. Describe it as folded names in the owner's order, present when the caller can see them, omitted on a private playlist the caller does not own.
- `PlaylistCreateRequest` (about line 6589): add optional `tags`, an array of strings. In the description, say the API allows at most `PLAYLIST_TAG_MAX_PER_PLAYLIST` items (default 5) and each name at most `PLAYLIST_TAG_NAME_MAX_LENGTH` characters (default 50, and startup refuses a character env above 50). Do not set `maxItems: 5` or `maxLength: 50`. A deployment can raise the count and can lower the character cap.
- `POST /playlist` (`operationId: apiPostPlaylist`, about line 18919): extend the create example with `tags: ["morning"]`, and the 201 example with `tags: ["morning"]`. The documented success status on that operation stays as it is.
- `PATCH /playlist/{playlist_id_text}` (`operationId: apiPatchPlaylistPlaylistIdText`, about line 19123): document optional `tags` on the request body. State that omitting `tags` leaves existing tags in place and that `tags: []` clears them. Add one example that sets two tags.
- `GET /playlist/{playlist_id_text}` response example, if one exists beside that path: include `tags`. If the response schema is only `additionalProperties: true`, the `Playlist` schema change is the contract. Do not invent a second playlist schema.

Do not add a query parameter in this plan.

## Tests

Update `apps/api/src/test/playlist.test.ts`:

- Create with `tags: ["  Adam Curry ", "adam curry"]` calls `replaceForPlaylist` with that raw array and `{ maxCount: 5, maxLength: 50 }` (the service folds). Response status stays 201.
- Create without `tags` does not call `replaceForPlaylist`.
- Create with 6 tags returns 400, the message is `A playlist has at most 5 tags.`, and it does not call replace.
- Create with one tag of 51 characters returns 400, the message is `A tag is at most 50 characters.`, and it does not call replace.
- Update without `tags` does not call replace.
- Update with `tags: []` calls replace with `[]` and `{ maxCount: 5, maxLength: 50 }`.
- Update as a non-owner returns 403 and does not call replace.
- A public detail fixture with `id_text` and a mocked map entry returns `tags` equal to that entry and no `sharable_status` object.
- A private detail fixture whose `account.id_text` is the caller returns `tags`.
- A followed-list fixture whose playlist is private and whose `account.id_text` is someone else omits `tags`.

New `apps/api/src/test/playlist-tag-http.integration.test.ts` on the real database:

- The owner creates a playlist with two tags. `GET` as the owner and as a signed-out caller on a public playlist returns `tags` in folded order.
- `PATCH` that omits `tags` leaves them. `PATCH` with a new array replaces them. `PATCH` with `[]` clears them. After the clear, a name that no playlist uses is gone from `playlist_tag`.
- A private playlist's `GET` as the owner includes `tags`. A signed-out `GET` is 404, the same as today.
- An unlisted playlist's `GET` as a signed-out caller includes `tags`.
- `GET /playlist/public/recent` for a public playlist includes `tags`, and an untagged public playlist is still in the list with `tags: []`.
- `GET /playlist/private/recent` as the owner includes tags on a private playlist.

In `apps/api/src/test/podverse-test-env-startup.test.ts`, after `buildPodverseApiTestEnv({ profile: 'apiVitest' })`:

- Deleting both playlist-tag keys still passes startup.
- `PLAYLIST_TAG_NAME_MAX_LENGTH=51` throws `startupFailureMessage`, and the printed validation output contains `PLAYLIST_TAG_NAME_MAX_LENGTH`. Spy on `console.error` and `loggerService.error` the way `expectStartupToRejectRecountWindow` does.
- `PLAYLIST_TAG_NAME_MAX_LENGTH=50` passes. `PLAYLIST_TAG_NAME_MAX_LENGTH=0` throws. `PLAYLIST_TAG_NAME_MAX_LENGTH=abc` throws.
- `PLAYLIST_TAG_MAX_PER_PLAYLIST=8` passes. `PLAYLIST_TAG_MAX_PER_PLAYLIST=0` throws. `PLAYLIST_TAG_MAX_PER_PLAYLIST=32768` throws.

No Playwright spec. No Maestro flow. The web and phone forms are later plans. The HTTP cases above run with the test env values 5 and 50, which match the defaults.

The existing API-key playlist create, update, and get tests send no `tags`. They must keep passing. Do not change their permission rows.

## Files

- `packages/helpers/src/dtos/playlist/playlist.ts`
- `packages/helpers-requests/src/api/playlist/playlist.ts`
- `packages/orm/src/services/playlist/publicPlaylistListSelect.ts`
- `apps/api/src/lib/playlistApiSerialization.ts`
- `apps/api/src/lib/accountPlaylistApiSerialization.test.ts`
- `apps/api/src/lib/playlistTags.ts`
- `apps/api/src/controllers/playlist/playlist.ts`
- `apps/api/src/controllers/profileContent.ts`
- `apps/api/openapi.yml`
- `apps/api/src/config/index.ts`
- `apps/api/src/lib/startup/validation.ts`
- `apps/api/.env.example`
- `apps/api/ENV.md`
- `infra/k8s/base/api/source/api.env`
- `packages/helpers-config/src/podverseTestEnv.ts`
- `apps/api/src/test/playlist.test.ts`
- `apps/api/src/test/playlist-tag-http.integration.test.ts`
- `apps/api/src/test/podverse-test-env-startup.test.ts`
- `apps/api/src/test/profile-content.test.ts` (only if that mock must stub `PlaylistTagService`)

## Release scratchpad

```markdown
## Playlist tags on create, edit, and read

- Surfaces: api
- Change: The playlist owner can save tags on create and edit. The API allows `PLAYLIST_TAG_MAX_PER_PLAYLIST` tags (unset means 5) and `PLAYLIST_TAG_NAME_MAX_LENGTH` characters per name (unset means 50). A longer list or a longer name is rejected with a sentence that names the configured number. A character value above 50, or a count above 32767, keeps the API from starting. A count may be higher than 5. Omitting tags on edit leaves them in place. Playlist list and detail payloads include `tags` as folded names. Public and unlisted playlists include them for anyone who can see the playlist. A private playlist includes them for the owner and omits the key for everyone else. An older stored playlist payload with no `tags` field still parses.
- Who notices: playlist owners, anyone reading a public or unlisted playlist, and operators who set the two limits
- Operator steps: leave the two API env vars unset or set them. The character cap cannot be above 50. The count can be above 5. The app migration is the playlist tag tables entry.
```
