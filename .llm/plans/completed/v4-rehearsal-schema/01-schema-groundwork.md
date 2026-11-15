# Schema groundwork for the v4 rehearsal

One change. Do not start until the operator says to run this plan. Do not
copy a library, seed an account, or fill the map in this plan.

Source of the decisions: `docs/proposals/v4-to-v5-migration/05-id-mapping-and-catalog-seeding.md`
and section 3 of `docs/proposals/v4-to-v5-migration/15-near-term-rehearsal-checklist.md`.

## Already decided

- `nano_id_v2` accepts 7–15 characters. `generateRandomIdText` stays 10
  characters. Change the domain check and `NANO_ID_V2_MIN_LENGTH` together,
  in the app database and the management database.
- Do not edit `0000_init_helpers.sql` or `0001_*_schema.sql`. Those files
  already applied. A later migration loosens the check.
- Do not mint a replacement id for a short v4 row.
- `account.v4_library_copied_at` is a nullable timestamp. Null means the
  identity is reserved and the library is not copied. This plan adds the
  column and nothing writes it.
- The legacy map lives in the app database. Columns are the table in doc 05.
  Store ids only. Do not store an email. Workers that insert rows are a
  later plan. This plan creates an empty table.
- v4 public ids of length 7–12 include `-` and `_` (rehearsal examples
  `g_lAQnsaL`, `9F6JX-FAJ2`). Length is the only check today. Do not add an
  alphabet check.

## Decided while writing this plan

- The map stays empty. No rehearsal-account rows in this plan. The operator
  confirmed this.

## Decided: which inserts keep a provided id

A v4 id is kept only where a public URL or another feature already depends on
it. Those entities are `account`, `channel`, `item`, `clip`, `playlist`,
`item_chapter`, and `item_soundbite`.

`queue` and `adminNotificationCampaign` also overwrite `id_text` on insert.
No v4 page uses those ids. Leave those two hooks as they are. They always
generate a new 10-character id.

## App migration

New file `infra/k8s/base/ops/source/database/linear-migrations/app/0005_v4_rehearsal_schema.sql`.

In this order:

1. Loosen the domain. Existing 9–15 character values still pass.

```sql
ALTER DOMAIN nano_id_v2 DROP CONSTRAINT nano_id_v2_len_check;
ALTER DOMAIN nano_id_v2 ADD CONSTRAINT nano_id_v2_len_check
  CHECK (VALUE IS NULL OR (char_length(VALUE) >= 7 AND char_length(VALUE) <= 15));
```

2. Add the account column. Match `notifications_last_read_at`: `timestamptz`,
   nullable, no default.

```sql
ALTER TABLE account ADD COLUMN v4_library_copied_at timestamptz;
```

3. Create `legacy_id_map`. `v5_id_text` uses `nano_id_v2` so a resolved id
   follows the same length rule and null stays allowed.

```sql
CREATE TABLE legacy_id_map (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  legacy_kind text NOT NULL,
  legacy_id text NOT NULL,
  v5_kind text NOT NULL,
  v5_id_text nano_id_v2,
  resolve_key text,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legacy_id_map_legacy_unique UNIQUE (legacy_kind, legacy_id),
  CONSTRAINT legacy_id_map_status_check
    CHECK (status IN ('mapped', 'unresolved', 'dropped')),
  CONSTRAINT legacy_id_map_legacy_kind_check
    CHECK (legacy_kind IN ('podcast', 'episode', 'mediaRef', 'playlist', 'user')),
  CONSTRAINT legacy_id_map_v5_kind_check
    CHECK (v5_kind IN (
      'channel', 'item', 'clip', 'item_chapter', 'item_soundbite', 'playlist', 'account'
    ))
);

CREATE INDEX legacy_id_map_v5_idx ON legacy_id_map (v5_kind, v5_id_text);
```

`legacy_id` is `text`, not `nano_id_v2`. Doc 05 allows a uuid, and a uuid is
longer than 15 characters. `resolve_key` is `text` because it may hold a feed
URL, a Podcast Index id, a podcast guid, an episode guid, or a media URL.

No `IF NOT EXISTS`. No email column. No seed rows.

## Management migration

New file `infra/k8s/base/ops/source/database/linear-migrations/management/0002_nano_id_v2_min_7.sql`.

The same `ALTER DOMAIN` only. Management has no `account` table and no map.

## ORM and id helper

- `packages/orm/src/lib/nanoid.ts`: `NANO_ID_V2_MIN_LENGTH` becomes 7.
  `generateRandomIdText` stays 10. The comment that says the domain does not
  enforce a minimum is wrong today and stays wrong if left as written.
  Describe the domain as 7–15 and generation as 10.
- Add `assignIdText(current: string | null | undefined): string`. When
  `current` passes `isValidNanoIdV2IdText`, return it. Otherwise return
  `generateRandomIdText()`.
- Call it from `generateIdText` on the seven entities that keep a v4 id:
  - `packages/orm/src/entities/account/account.ts`
  - `packages/orm/src/entities/channel/channel.ts`
  - `packages/orm/src/entities/item/item.ts`
  - `packages/orm/src/entities/item/itemChapter.ts`
  - `packages/orm/src/entities/item/itemSoundbite.ts`
  - `packages/orm/src/entities/clip.ts`
  - `packages/orm/src/entities/playlist/playlist.ts`
- Do not change `packages/orm/src/entities/queue/queue.ts` or
  `packages/orm/src/entities/account/adminNotificationCampaign.ts`.
- `Account.v4_library_copied_at`: `timestamptz`, nullable. Comment: null means
  the library has not been copied.
- New entity `packages/orm/src/entities/legacyIdMap.ts` for `legacy_id_map`,
  and export it from the ORM barrel the other entities use. No service and
  no route.

## Markers and the migration list

Follow **migration-readiness-marker-sync** and **linear-sql-greenfield-only**.

- Add both new SQL files to `infra/k8s/base/ops/kustomization.yaml` under
  `podverse-ops-app-linear-migrations` and
  `podverse-ops-management-linear-migrations`.
- Set `API_EXPECTED_MIGRATION_FILENAME` to `0005_v4_rehearsal_schema.sql` in
  `infra/k8s/base/api/source/api.env` and in the ops kustomization literal.
- Set `MANAGEMENT_API_EXPECTED_MIGRATION_FILENAME` to
  `0002_nano_id_v2_min_7.sql` in
  `infra/k8s/base/management-api/source/management-api.env` and in the ops
  kustomization literal.
- Leave the deployment initContainers reading those env vars. Do not hardcode
  a filename there.
- In the same change, run `make db_regen_linear_baseline` and
  `make db_verify_linear_baseline`. Leave the regenerated
  `0004_app_linear_baseline.sql.gz` and `0005_management_linear_baseline.sql.gz`
  in the working tree. Do not hand-edit the gz files.

## Guidance that names the old minimum

Update `.cursor/skills/e2e-seed-nano-id-limits/SKILL.md` so the minimum it
states is 7, matching the domain. Existing seed ids of 9–15 stay valid. Do
not shorten them.

## Tests

Unit tests, not a full E2E run:

- `isValidNanoIdV2IdText` accepts length 7 and 15, including `-` and `_`.
  It rejects length 6 and 16.
- `generateRandomIdText` returns length 10.
- `assignIdText` keeps `eFv5NFx` and `g_lAQnsaL`, and replaces an empty
  string and a 6-character string with a 10-character id.

## Out of scope

- Identity seed, library copy, playlist `list_position` writes, and the
  membership-expiry import.
- Inserts into `legacy_id_map`.
- Redirects that read the map.
- A v4 API change.
- Refreshing the prod-copy database.

## When the change ships

Append a scratchpad entry. Surfaces: api database, management database, orm,
k8s markers. Who notices: a 7- or 8-character v4 id can be stored; new ids
are still 10 characters; `account.v4_library_copied_at` and `legacy_id_map`
exist and are empty.

## Verify

From the **Root** tab, after the SQL and the helper exist:

```bash
npm run test -w @podverse/orm
make db_verify_linear_baseline
```

`make db_regen_linear_baseline` runs during the change, before that verify.
