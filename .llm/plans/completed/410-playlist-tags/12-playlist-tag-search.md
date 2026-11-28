**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# Playlist tag autocomplete search

While someone types a tag, the app can ask for names already stored. This route only reads. Saving a playlist is what inserts a name.

## Rows

R4, R5, R15

## Runs after

10, 11

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue.

## Decisions

- `GET /playlist/tag?q=` is public. `security: []`. It does not call `ensureAuthenticated` or `optionalEnsureAuthenticated`. An API key is neither required nor checked. Do not add `x-api-key-permission`. Do not add the route to the API-key allow list or the closed-to-keys list.
- Results are a prefix on the folded name, at most `PLAYLIST_TAG_SEARCH_LIMIT` (10), ordered by name. The client cannot pass a limit or a page.
- The prefix is folded with `normalizePlaylistTagName` before it is matched. `"ADAM"` matches a stored `adam curry` only as a prefix (`adam` starts `adam curry`). A query of `curry` does not match `adam curry`.
- Names that exist only on private playlists are absent. That rule is already in `PlaylistTagService.searchVisiblePrefix`. Do not widen it for a signed-in caller.
- The route does not insert, update, or delete tag rows.

## Route

In `apps/api/src/routes/playlist.ts`, register `GET /tag` with the other static paths, directly before `GET /public/recent`. It must stay above `GET /:playlist_id_text`.

```typescript
router.get('/tag', asyncHandler(PlaylistController.searchPlaylistTags));
```

Handler on `PlaylistController`:

- Validate with a new schema in `apps/api/src/lib/validation/querySchemas.ts`:

```typescript
export const playlistTagSearchQuerySchema = {
  q: Joi.string().trim().min(1).max(PLAYLIST_TAG_NAME_MAX_LENGTH).required(),
};
```

- Missing, blank, or longer than 50 characters is 400 through the existing query validator.
- Call `playlistTagService.searchVisiblePrefix(q)`.
- Respond `200` with `{ data: string[] }`. No `meta` page object.
- When the folded prefix is empty or too long, the service returns `[]`. Joi already rejects a blank `q`. A `q` of spaces fails `min(1)` after trim.

Do not add `apiKeyAccess`.

## Client

In `packages/helpers-requests/src/api/playlist/playlist.ts`:

```typescript
export async function reqPlaylistTagSearch(api: ApiRequestService, q: string) {
  return api.apiRequest<{ data: string[] }>({
    path: '/playlist/tag',
    method: 'GET',
    config: { params: { q } },
  });
}
```

`packages/helpers-requests/src/api/_request.ts` is large. Search the playlist import block (about line 267) and the `reqPlaylistCreate` method (about line 1461). Add the import and a method `reqPlaylistTagSearch(q: string)` that forwards to the function. Do not read the file end to end.

No cookie requirement. Signed-out callers can search.

## OpenAPI

Search `apps/api/openapi.yml` for `/playlist/public/recent` (about line 21132). Insert `/playlist/tag` immediately before that path.

- `operationId: apiGetPlaylistTag`
- `security: []`
- Query parameter `q`, required string
- `200` schema: object with `data`, an array of strings
- No request body
- Describe it as a prefix search of folded tag names that are on at least one public or unlisted playlist, at most 10 names

Add the response schema next to `Playlist` if a named schema is how neighboring list responses are declared. A small inline schema is fine when the neighbor for this path is also inline. Match the file's local pattern for a tiny object. Do not mark the operation authenticated.

## Tests

`apps/api/src/test/playlist-tag-search.integration.test.ts` on the real database:

- A public playlist tagged `adam curry` makes `GET /playlist/tag?q=AD` return `data` containing `adam curry`.
- `q=curry` does not return `adam curry`.
- A name used only on a private playlist is absent for a signed-out caller and for a different signed-in caller.
- A name used on an unlisted playlist is present.
- Missing `q` and `q` longer than 50 return 400.
- The response has at most 10 strings, ordered by name, when more than 10 public names share the prefix.
- The request does not insert a `playlist_tag` row. Count the catalog before and after a search that matches nothing.

`apps/api/src/test/playlist.test.ts`: the route is public and returns 200 with `{ data: [] }` when the mocked `searchVisiblePrefix` returns an empty array. Mock that method on the `PlaylistTagService` added by plan 11.

No Playwright spec. No Maestro flow. Forms call this later.

Do not add the path to `apps/api/src/test/api-key-routes-playlists-queue-clips.integration.test.ts` or `api-key-routes-denied.integration.test.ts`.

## Files

- `apps/api/src/routes/playlist.ts`
- `apps/api/src/controllers/playlist/playlist.ts`
- `apps/api/src/lib/validation/querySchemas.ts`
- `apps/api/openapi.yml`
- `packages/helpers-requests/src/api/playlist/playlist.ts`
- `packages/helpers-requests/src/api/_request.ts`
- `apps/api/src/test/playlist-tag-search.integration.test.ts`
- `apps/api/src/test/playlist.test.ts`

## Release scratchpad

```markdown
## Playlist tag name search

- Surfaces: api
- Change: `GET /playlist/tag?q=` returns up to 10 folded tag names that start with the typed text, ignoring case. Names that exist only on private playlists are left out. The search does not save a tag.
- Who notices: playlist editors, once the apps call this route, and any client that looks up a public tag name
- Operator steps: none
```
