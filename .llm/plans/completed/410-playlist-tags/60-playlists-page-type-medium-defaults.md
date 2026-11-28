**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Playlists page type and medium defaults

`/playlists` can open on an operator-chosen type and medium. Blank keeps today's opening. A saved choice and an explicit URL still win. Browse playlists does not read these vars. Sort and range stay on `NEXT_PUBLIC_PLAYLISTS_DEFAULT_SORT` and `NEXT_PUBLIC_PLAYLISTS_DEFAULT_RANGE`.

## Rows

R14

## Runs after

none

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue. This planning step did not run `gh`.

## Decisions

- Type and medium env apply only to `/playlists` (`fd.playlists`). Browse playlists (`fd` key `browse-playlists`) keeps `resolveBrowseParams` in `apps/web/src/app/playlists/playlistsListSsr.ts`: browse sort stays `configuredSort('browse', ...)`, browse medium stays URL, then the browse cookie, then `all`. Do not pass `public.playlistsPage` into that function.
- `NEXT_PUBLIC_PLAYLISTS_DEFAULT_TYPE` blank means today's opening: signed-in My Playlists (`private`), signed-out Global (`public`). Tokens are `private`, `private_followed`, and `public`.
- A signed-out visitor ignores a type env of `private` or `private_followed` and opens Global. An explicit URL or a saved cookie of `private` or `private_followed` still applies when signed out, which is what the page does today (the client then shows the login message).
- When the resolved type is `public` and neither the URL nor the cookie names a sort, use the existing sort and range opening, including for a signed-in visitor. When the resolved type is `private` or `private_followed` and neither names a sort, the sort is `a_z` and the range is null for a signed-in visitor. A signed-out visitor whose URL or cookie type is not public keeps today's sort fallback (the public sort opening). A URL or cookie sort still wins for every type.
- `NEXT_PUBLIC_PLAYLISTS_DEFAULT_MEDIUM` tokens are `all`, `av`, and `music`. Blank and `all` both open All. The env files set `all`, the same way sort is set to `recent` and range to `week`.
- Unknown tokens are rejected at sidecar startup. The parser still treats an unknown token as unset so a bypassed sidecar does not throw.

## Parser

In `packages/helpers/src/lib/playlistsPageDefaults.ts`:

- Import `QUERY_PARAMS_QUEUE_MEDIUMS` from `./medium.js`.
- Add `PLAYLISTS_PAGE_TYPES = ['private', 'private_followed', 'public'] as const` and `PlaylistsPageType`.
- Extend `PlaylistsPageDefaultField` with `'playlistsType'` and `'playlistsMedium'`.
- Extend `PlaylistsPageDefaults` with `type: PlaylistsPageType | null` and `medium: QueryParamsQueueMedium | null`.
- Extend `PlaylistsPageDefaultEnv` with optional `type` and `medium` strings.
- Extend `PlaylistsPagePublicOpening` with those same `type` and `medium` fields. `playlistsPublicOpening` copies them through. Sort and range behavior stays as it is: Recent drops range, Top with a blank range is week.
- `parsePlaylistsPageDefaults` parses type with `PLAYLISTS_PAGE_TYPES` and medium with `QUERY_PARAMS_QUEUE_MEDIUMS`, through the existing `parseToken` helper. A blank string is null and is not an issue. An unknown token is an issue and null.

Do not import `@podverse/helpers-requests` into this package.

## Resolver

Add `apps/web/src/app/playlists/resolvePlaylistsPageFilters.ts`. Web imports are extensionless. Named exports only. No `any`. No type assertion.

```typescript
export function resolvePlaylistsPageFilters(input: {
  isAuthenticated: boolean;
  url: {
    page: number;
    type: QueryParamsPlaylistsType | null;
    sort: QueryParamsSubscribedFullSort | null;
    range: QueryParamsStatsRange | null;
    medium: QueryParamsQueueMedium | null;
  };
  cookie: PlaylistsFilterDefaults | undefined;
  opening: PlaylistsPagePublicOpening;
}): PlaylistsPageDropdownConfigCurrentParams
```

Use `??` for sort, range, and medium. A stored null range is not a saved range. Do not use a key check for those three.

1. Type is `url.type`, else `cookie?.type`, else the type opening. The type opening is `public` when `opening.type` is `public`. It is `opening.type` when that is `private` or `private_followed` and `isAuthenticated` is true. Otherwise it is `private` when authenticated and `public` when not.
2. Sort is `url.sort`, else `cookie?.sort`, else `opening.sort` when the resolved type is `public` or the visitor is signed out, else `a_z`.
3. Range is `url.range`, else `cookie?.range`, else `opening.range` when the resolved type is `public` or the visitor is signed out, else null.
4. Medium is `url.medium`, else `cookie?.medium`, else `opening.medium`, else `DEFAULT_PLAYLISTS_PAGE_MEDIUM` (`all`).
5. Return `getPlaylistsPageFilterParams` from `./PlaylistsPageDropdownConfig` with that type, sort, range, medium, and `url.page`.

`apps/web/src/app/playlists/page.tsx` `parseSearchParams` becomes a wrapper. On a failed `searchParamsSchema` parse, pass page `1` and null type, sort, range, and medium (the URL is discarded, matching today). On success, pass `parsed.data`. Call `resolvePlaylistsPageFilters`, then keep `guardSubscribedSsrFilter` around the resolved type, sort, range, and page with the same public fallback the page uses now. Playlist tokens are not `subscribed`, so the guard returns the resolved values. Medium stays the resolver's `currentMedium`.

Do not change `handleTypeChange` in `PlaylistsPageChipRow.tsx`. Switching to Global still applies `playlistsPage.sort` and `playlistsPage.range`. Switching to My Playlists or Subscribed still applies `a_z` and a null range.

Do not edit `playlistsListSsr.ts`.

## Config and env

`apps/web/src/config/index.ts` passes `type: env.NEXT_PUBLIC_PLAYLISTS_DEFAULT_TYPE` and `medium: env.NEXT_PUBLIC_PLAYLISTS_DEFAULT_MEDIUM` into `parsePlaylistsPageDefaults`. No `||` and no `?? ''`. Optional missing values stay `undefined`; the parser treats that as unset.

Add both keys in each of these, in this order, immediately after `NEXT_PUBLIC_PLAYLISTS_DEFAULT_SORT`:

- `apps/web/src/config/runtime-config.ts` — the `WebRuntimeConfigEnvKey` union and `webRuntimeConfigEnvKeys.optional`
- `apps/web/sidecar/src/server.ts` — `optionalKeys`, `PLAYLISTS_PAGE_ENV_FIELDS` (`type` and `medium`), and `getCategory` (`Lists`)

Rewrite `validatePlaylistsPageDefault` so a non-sort key is not parsed as a range. Blank trim still returns Skipped. Otherwise call `parsePlaylistsPageDefaults({ [field]: value })`. When `issues` is empty, the result is valid. When it is not, the message lists the allowed tokens for that field: sort `PLAYLISTS_PAGE_PUBLIC_SORTS`, range `PLAYLISTS_PAGE_RANGES`, type `PLAYLISTS_PAGE_TYPES`, medium `QUERY_PARAMS_QUEUE_MEDIUMS`.

`apps/web/sidecar/.env.example` (quoted) and `infra/k8s/base/web/source/web-sidecar.env` (unquoted). One comment line per key. Do not edit `apps/web/sidecar/.env`.

```
# Blank keeps today's opening: signed-in My Playlists, signed-out Global. private, private_followed, or public.
NEXT_PUBLIC_PLAYLISTS_DEFAULT_TYPE=
# all, av, or music. Blank is all.
NEXT_PUBLIC_PLAYLISTS_DEFAULT_MEDIUM="all"
```

K8s uses `NEXT_PUBLIC_PLAYLISTS_DEFAULT_TYPE=` and `NEXT_PUBLIC_PLAYLISTS_DEFAULT_MEDIUM=all` with the same comments, one key name per comment line.

`apps/web/ENV.md` Playlists section: keep the sort and range bullets. Add type and medium. Say they apply to `/playlists` only, a saved choice and an explicit URL still win, a blank type keeps signed-in My Playlists and signed-out Global, a signed-out visitor ignores a private or subscribed type env, and medium `all` or blank opens All. Browse playlists does not read them. Signed-in My Playlists with no saved sort stays A-Z. A public opening with no saved sort uses the sort and range env, including when the visitor is signed in.

## Leave unchanged

- `apps/web/src/app/playlists/playlistsListSsr.ts` and `resolveBrowseParams`
- `packages/helpers-requests` query params
- Playlist create and edit, list rows, mobile, and catalog files
- `apps/web/e2e/playlists-profiles-chips.spec.ts` (signed-out `/playlists` still opens Global, Filter All, Sort Recent while these vars are unset or medium is `all`)

## Files

- packages/helpers/src/lib/playlistsPageDefaults.ts
- packages/helpers/src/lib/playlistsPageDefaults.test.ts
- apps/web/src/app/playlists/resolvePlaylistsPageFilters.ts
- apps/web/src/app/playlists/resolvePlaylistsPageFilters.test.ts
- apps/web/src/app/playlists/page.tsx
- apps/web/src/config/index.ts
- apps/web/src/config/runtime-config.ts
- apps/web/sidecar/src/server.ts
- apps/web/sidecar/.env.example
- apps/web/ENV.md
- infra/k8s/base/web/source/web-sidecar.env

## Tests

Extend `packages/helpers/src/lib/playlistsPageDefaults.test.ts`. Every existing fixture and expectation gains `type: null` and `medium: null`. Add:

- Blank type and medium produce null and no issues.
- `private_followed` and `music` are accepted.
- `subscribed` and `video` produce issues `playlistsType` and `playlistsMedium` and nulls.
- `playlistsPublicOpening` copies type and medium and still drops a range when the sort is Recent.

Add `apps/web/src/app/playlists/resolvePlaylistsPageFilters.test.ts` (Vitest, `npm run test -w apps/web`). Cover:

- Signed out, no URL, no cookie, opening type `private`: type `public`, sort and range from the opening.
- Signed in, no URL, no cookie, opening type null: type `private`, sort `a_z`, range null.
- Signed in, no URL, no cookie, opening type `public`, sort `top`, range `month`: those three values.
- URL type beats cookie type and the opening. Cookie type beats the opening.
- URL medium beats cookie medium and the opening. Cookie medium beats the opening. A null opening medium is `all`.
- Signed out with URL type `private` and no sort: type stays `private` and sort is the public opening sort.
- A cookie sort beats the opening sort when the type is public.

No Playwright spec. No API test. No Maestro flow.

## Release scratchpad

```markdown
## Playlists page type and medium defaults

- Surfaces: web
- Change: `NEXT_PUBLIC_PLAYLISTS_DEFAULT_TYPE` and `NEXT_PUBLIC_PLAYLISTS_DEFAULT_MEDIUM` set the opening type and medium on `/playlists` when the visitor has no saved choice and the URL does not name one. Blank type keeps signed-in My Playlists and signed-out Global. Medium blank or `all` opens All. A saved choice and an explicit URL still win. Browse playlists does not read these.
- Who notices: operators who set the vars, and visitors on a frontend where they are set
- Operator steps: set them on the web sidecar. Leave type blank to keep today's opening. Type is `private`, `private_followed`, or `public`. Medium is `all`, `av`, or `music`.
```
