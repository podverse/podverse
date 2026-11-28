**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# Playlist tag storage

Tag names live in one catalog. A playlist points at those rows in the owner's order. A name is stored only in its folded form, so uniqueness is case-insensitive. Nothing in this plan adds an HTTP route.

## Rows

R1, R5, R7, R24, R26, R28, R29, R37

## Runs after

none

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue.

## Decisions

- Two tables, not a jsonb column on `playlist`. A catalog row is how a name stays unique and how autocomplete can search names. The assignment table stores those names in the owner's order. How many names one playlist may hold is the API limit from plan 11. That limit defaults to 5 and may be higher.
- The stored name is the folded form. There is no second display-casing column. Clients show the strings the API returns.
- `PLAYLIST_TAG_NAME_MAX_LENGTH` and `PLAYLIST_TAG_MAX_PER_PLAYLIST` stay constants in `@podverse/helpers`: `DATABASE_CONSTANTS.varchar_short` (50) and 5. They are the defaults when the API env is unset, and the client fallback until a later plan serves the live numbers. The name column stays `public.varchar_short` (`VARCHAR(50)` in `infra/k8s/base/ops/source/database/linear-migrations/app/0000_init_helpers.sql`). The assignment table does not cap the count at 5. The normalize helpers take an optional limit and use these constants when the caller omits it. Plan 11 passes the configured numbers.
- `PLAYLIST_TAG_MAX_PER_PLAYLIST_ENV_CEILING` is `32767`, the highest `smallint` value. `list_position` is `smallint`. Plan 11 refuses a count env above this ceiling. It is not the default and not the client fallback.
- Free text. Trim, collapse whitespace, strip control characters, then `toLowerCase()` with no locale. Do not restrict the name to a slug alphabet.
- A tag row that no playlist still uses is removed when the transaction commits. The catalog is names in use.
- Do not add columns or tags to clips. Do not add a display proxy, a frontend allowlist, or a per-frontend playlist id list.

## Name rules

Add `packages/helpers/src/lib/playlistTag.ts`. It imports nothing from Node. Export it from `packages/helpers/src/index.ts` beside `./lib/playlist.js`. Add a package subpath `./playlistTag` in `packages/helpers/package.json` `exports`, pointing at `dist/lib/playlistTag.js` and its `.d.ts`, in the same shape as `./listScreenDefaults`. Mobile cannot import the helpers barrel. Web and the API may import from `@podverse/helpers`. Mobile later imports `@podverse/helpers/playlistTag`.

Constants:

- `PLAYLIST_TAG_NAME_MAX_LENGTH` = `DATABASE_CONSTANTS.varchar_short`
- `PLAYLIST_TAG_MAX_PER_PLAYLIST` = `5`
- `PLAYLIST_TAG_MAX_PER_PLAYLIST_ENV_CEILING` = `32767`
- `PLAYLIST_TAG_SEARCH_LIMIT` = `10`

`playlistTagCountLimitMessage(maxCount: number)` returns `A playlist has at most N tags.` with `N` replaced by `maxCount`.

`playlistTagNameLengthLimitMessage(maxLength: number)` returns `A tag is at most N characters.` with `N` replaced by `maxLength`.

Always use the words `tags` and `characters`, including when the number is 1. Plan 11 uses these two functions for the 400 body so the sentence names the configured number.

`normalizePlaylistTagName(raw: string, maxLength: number = PLAYLIST_TAG_NAME_MAX_LENGTH)` returns `{ ok: true, name: string }` or `{ ok: false, reason: 'empty' | 'too_long' }`.

1. Replace characters in `\u0000`–`\u001F` and `\u007F` with a space.
2. Trim the ends and collapse every remaining whitespace run to one ASCII space.
3. `toLowerCase()` with no locale argument.
4. Length 0 is `empty`. Length greater than `maxLength` is `too_long`.

`normalizePlaylistTagList(raw: readonly string[], limits?: { maxCount?: number; maxLength?: number })` returns `{ ok: true, tags: string[] }` or `{ ok: false, reason: 'too_many' | 'too_long' }`.

Omitted `maxCount` is `PLAYLIST_TAG_MAX_PER_PLAYLIST`. Omitted `maxLength` is `PLAYLIST_TAG_NAME_MAX_LENGTH`. Pass each entry's length check through `normalizePlaylistTagName(entry, maxLength)`.

- `raw.length` greater than `maxCount` is `too_many`, including when some entries are blank.
- Any entry that is `too_long` makes the list `too_long`.
- `empty` entries are dropped.
- After folding, keep the first copy of a repeated name and drop the later ones.
- A list that drops down to nothing is `{ ok: true, tags: [] }`.

`escapePlaylistTagLikePrefix(folded: string)` escapes `\`, `%`, and `_` by prefixing `\`. It does not add the trailing wildcard.

Unit tests in `packages/helpers/src/lib/playlistTag.test.ts`:

- `"  Adam   Curry "` becomes `"adam curry"`.
- `"ADAM-CURRY"` and `"adam-curry"` are the same name.
- A newline between two words becomes one space.
- `"Foo"` twice in a list of five becomes one `"foo"`.
- Six strings is `too_many` when no limit is passed.
- Six strings with `maxCount` 8 is `{ ok: true }`.
- 51 characters is `too_long` when no limit is passed.
- 41 characters with `maxLength` 40 is `too_long`. 40 characters with `maxLength` 40 is `ok`.
- `playlistTagCountLimitMessage(5)` is `A playlist has at most 5 tags.` `playlistTagCountLimitMessage(8)` is `A playlist has at most 8 tags.`
- `playlistTagNameLengthLimitMessage(50)` is `A tag is at most 50 characters.` `playlistTagNameLengthLimitMessage(40)` is `A tag is at most 40 characters.`
- `""` and `"   "` are dropped, and a list of only those is `{ ok: true, tags: [] }`.
- The like-prefix helper escapes `%`, `_`, and `\`.

## Schema

New file `infra/k8s/base/ops/source/database/linear-migrations/app/0023_playlist_tag.sql`. Do not edit `0001_app_schema.sql`. Plain `CREATE` only. No `IF NOT EXISTS`.

```sql
CREATE TABLE public.playlist_tag (
    id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name public.varchar_short NOT NULL,
    CONSTRAINT playlist_tag_name_key UNIQUE (name),
    CONSTRAINT playlist_tag_name_trimmed_check CHECK (
        name = btrim(name) AND char_length(name) > 0
    )
);

CREATE TABLE public.playlist_tag_assignment (
    playlist_id integer NOT NULL,
    playlist_tag_id integer NOT NULL,
    list_position smallint NOT NULL,
    CONSTRAINT playlist_tag_assignment_pkey PRIMARY KEY (playlist_id, playlist_tag_id),
    CONSTRAINT playlist_tag_assignment_playlist_position_key UNIQUE (playlist_id, list_position),
    CONSTRAINT playlist_tag_assignment_list_position_check CHECK (
        list_position >= 1
    ),
    CONSTRAINT playlist_tag_assignment_playlist_id_fkey
        FOREIGN KEY (playlist_id) REFERENCES public.playlist (id) ON DELETE CASCADE,
    CONSTRAINT playlist_tag_assignment_playlist_tag_id_fkey
        FOREIGN KEY (playlist_tag_id) REFERENCES public.playlist_tag (id) ON DELETE CASCADE
);

CREATE INDEX playlist_tag_assignment_playlist_tag_id_idx
    ON public.playlist_tag_assignment (playlist_tag_id);
```

The unique index on `playlist_tag.name` is the case-insensitive uniqueness rule, because every writer stores the folded name.

`list_position` is `smallint`. The check requires a position of at least 1. Do not add a database check that hardcodes 5. The name column stays `public.varchar_short`, so a name longer than 50 characters cannot be inserted. The trimmed non-empty check stays.

Unused-name cleanup is a constraint trigger so it runs at commit. An immediate trigger would delete a catalog row in the middle of a replace that deletes assignments and inserts them again.

```sql
CREATE FUNCTION public.delete_unused_playlist_tag() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.playlist_tag
  WHERE id = OLD.playlist_tag_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.playlist_tag_assignment
      WHERE playlist_tag_id = OLD.playlist_tag_id
    );
  RETURN OLD;
END;
$$;

CREATE CONSTRAINT TRIGGER playlist_tag_assignment_delete_unused_tag
  AFTER DELETE ON public.playlist_tag_assignment
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_unused_playlist_tag();
```

Readiness, in the same change:

- `infra/k8s/base/api/source/api.env`: `API_EXPECTED_MIGRATION_FILENAME=0023_playlist_tag.sql` (unquoted).
- `infra/k8s/base/ops/kustomization.yaml`: the same literal under `podverse-ops-migration-scripts`, and add the new SQL file under `podverse-ops-app-linear-migrations` after `0022_feed_log_response_truncated.sql`.
- Leave `MANAGEMENT_API_EXPECTED_MIGRATION_FILENAME` and `infra/k8s/base/management-api/source/management-api.env` on `0002_nano_id_v2_min_7.sql`.
- Do not edit `infra/k8s/base/api/deployment.yaml`. It already reads the env var.
- Do not add these tables to `apps/management-api/src/lib/database/tablePolicy.ts`.

From the repo root, in this change, run `make db_regen_linear_baseline` and then `make db_verify_linear_baseline`. Leave the regenerated `infra/k8s/base/db/source/bootstrap/0004_app_linear_baseline.sql.gz` and `0005_management_linear_baseline.sql.gz` in the tree. Do not hand-edit the gz files.

## Entities and service

`SnakeNamingStrategy` maps class names to these table names. Do not set a custom table name.

`packages/orm/src/entities/playlist/playlistTag.ts`

- `PlaylistTag`: `@PrimaryGeneratedColumn()`, `name` varchar unique length `DATABASE_CONSTANTS.varchar_short`.
- `PlaylistTagAssignment`: composite `@PrimaryColumn()` on `playlist_id` and `playlist_tag_id`, `list_position` smallint, `@Unique(['playlist_id', 'list_position'])`, both `@ManyToOne` with `onDelete: 'CASCADE'` and `@JoinColumn` names `playlist_id` and `playlist_tag_id`. Follow `AccountFollowingPlaylist` for the composite key style.

Do not add a tags relation on `Playlist`. Existing playlist queries must not start joining these tables.

Register both classes in `packages/orm/src/db/entities.ts` immediately after `PlaylistResource`, and export the entity module from `packages/orm/src/index.ts` beside `entities/playlist/playlistResource.js`.

`packages/orm/src/services/playlist/playlistTag.ts`, class `PlaylistTagService`. Export it from `packages/orm/src/index.ts` beside `services/playlist/playlistResource.js`. Use the read-write data source for writes and the read source for reads. Call `normalizePlaylistTagName` / `normalizePlaylistTagList` from `@podverse/helpers`. Do not copy the fold logic.

`replaceForPlaylist(playlistId: number, rawNames: readonly string[], limits?: { maxCount: number; maxLength: number }): Promise<void>`

- Run `normalizePlaylistTagList(rawNames, limits)`. When `limits` is omitted, the helper uses the two constants (5 names, 50 characters). Throw if it is not `ok`. The HTTP layer returns 400 before calling this with a bad list. The throw stops a second writer from skipping the helper. Plan 11 always passes the configured count and the configured character cap. A count above 5 is stored when that argument says so.
- One transaction:
  1. For each folded name, `INSERT INTO playlist_tag (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, then `SELECT id`. `ON CONFLICT` is application code for two saves of the same new name at once. Do not put `ON CONFLICT` in the migration. Do not catch a unique violation inside the transaction. In Postgres that aborts the transaction.
  2. `DELETE FROM playlist_tag_assignment WHERE playlist_id = $playlistId`.
  3. Insert the new assignment rows with `list_position` 1..n in list order.
- Commit. The deferred trigger then removes a catalog row that has no assignment left. A name this playlist still uses is inserted again before commit, so the trigger keeps it.

`loadTagNamesByPlaylistIdText(idTexts: readonly string[]): Promise<Map<string, string[]>>`

- One query. Join `playlist`, `playlist_tag_assignment`, and `playlist_tag`. `WHERE playlist.id_text = ANY($1)`. `ORDER BY playlist.id_text, playlist_tag_assignment.list_position`.
- Map values are folded names in that order. An id with no rows is absent from the map. The caller treats absence as no tags.

`searchVisiblePrefix(rawPrefix: string): Promise<string[]>`

- Fold with `normalizePlaylistTagName`. `empty` or `too_long` returns `[]`.
- Pattern is `escapePlaylistTagLikePrefix(name) + '%'`.
- SQL matches `playlist_tag.name LIKE $pattern ESCAPE '\'`, and the name has an assignment whose playlist `sharable_status_id` is `SharableStatusEnum.Public` or `SharableStatusEnum.Unlisted`.
- `ORDER BY playlist_tag.name ASC` `LIMIT PLAYLIST_TAG_SEARCH_LIMIT`.
- A name that exists only on private playlists is not returned. A name that is also on a public or unlisted playlist is returned.

## Out of scope

- No route, controller, OpenAPI, DTO field, or API env. Plan 11 reads the limits and passes them into `replaceForPlaylist`. Later plans call this service.
- No clip entity, clip route, or clip column.
- No proxy and no change to catalog allowlist code.
- No edit to `Playlist` columns.

## Tests

`apps/api/src/test/playlist-tag.integration.test.ts`, real database, same setup style as `apps/api/src/test/playlist-public-recent.integration.test.ts` (minimal ORM mock, seed with SQL, delete the seeded playlists in `afterAll` so the cascade and the deferred trigger clean the tag rows).

- Saving `["  Adam Curry ", "adam curry", "Podcasting-2.0"]` on one playlist stores two names, `adam curry` then `podcasting-2.0`.
- A second playlist saved with `"ADAM CURRY"` reuses the same `playlist_tag` row.
- Replacing the first playlist's tags with `[]` leaves the shared name in place and removes `podcasting-2.0` after the transaction commits.
- Deleting the last playlist that uses a name removes that catalog row.
- `searchVisiblePrefix("adam")` returns the public playlist's name. The same prefix does not return a name that exists only on a private playlist. It does return a name that is on an unlisted playlist.
- `searchVisiblePrefix("ADAM")` matches the folded stored name.
- A sixth tag, with no limits argument, throws and writes nothing.
- `replaceForPlaylist` with `maxCount` 8 and six names stores six assignments, `list_position` 1 through 6.

Helper unit tests are listed under Name rules. No Playwright spec. No Maestro flow.

## Files

- `infra/k8s/base/ops/source/database/linear-migrations/app/0023_playlist_tag.sql`
- `infra/k8s/base/api/source/api.env`
- `infra/k8s/base/ops/kustomization.yaml`
- `infra/k8s/base/db/source/bootstrap/0004_app_linear_baseline.sql.gz`
- `infra/k8s/base/db/source/bootstrap/0005_management_linear_baseline.sql.gz`
- `packages/helpers/src/lib/playlistTag.ts`
- `packages/helpers/src/lib/playlistTag.test.ts`
- `packages/helpers/src/index.ts`
- `packages/helpers/package.json`
- `packages/orm/src/entities/playlist/playlistTag.ts`
- `packages/orm/src/db/entities.ts`
- `packages/orm/src/services/playlist/playlistTag.ts`
- `packages/orm/src/index.ts`
- `apps/api/src/test/playlist-tag.integration.test.ts`

## Release scratchpad

```markdown
## Playlist tag tables

- Surfaces: api, k8s
- Change: App migration `0023_playlist_tag.sql` adds `playlist_tag` (one folded name, unique, `varchar_short` / 50 characters) and `playlist_tag_assignment` (names in order). The assignment table does not cap the count at 5. A name with no playlist left is removed at commit. `API_EXPECTED_MIGRATION_FILENAME` advances to that file. The management marker stays `0002_nano_id_v2_min_7.sql`. No HTTP field yet.
- Who notices: operators applying app migrations
- Operator steps: app migrations run through `0023_playlist_tag.sql`
```
