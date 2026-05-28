# Plan 05 — Find options: apps and parser

## Objective

Convert all remaining **string-array** `relations` and `select` find options in `apps/api`, `packages/parser`, `apps/management-api`, workers, and scripts to TypeORM v1 object syntax.

## Scope

### String `relations: [` (17 files outside packages/orm)

**apps/api (14):**

- `apps/api/src/controllers/account/account.ts`
- `apps/api/src/controllers/account/accountFollowingAccount.ts`
- `apps/api/src/controllers/account/accountFollowingChannel.ts`
- `apps/api/src/controllers/account/accountFollowingPlaylist.ts`
- `apps/api/src/controllers/clip.ts`
- `apps/api/src/controllers/itemSoundbite.ts`
- `apps/api/src/controllers/membership.ts`
- `apps/api/src/controllers/playlist/playlist.ts`
- `apps/api/src/controllers/profileContent.ts`
- `apps/api/src/controllers/queue/queue.ts`
- `apps/api/src/lib/auth/index.ts`
- `apps/api/src/lib/followed.ts`

**packages/parser (2):**

- `packages/parser/src/lib/rss/liveItem/liveItem.ts`
- `packages/parser/src/lib/rss/remoteItemParser.ts`

**apps/management-api (1):**

- `apps/management-api/src/orm/services/adminAccount.ts`

### String `select: [` (4 files)

- `packages/parser/src/lib/chapters/chapters.ts`
- `packages/parser/src/lib/rss/item/item.ts`
- `apps/workers/src/commands/orm/addByRSS/reencryptCredentials.ts`
- `scripts/add-by-rss/reencrypt-add-by-rss-credentials.ts`

## Conversion rules

Same as [plan 04](./04-find-options-orm-package.md):

| Before | After |
| ------ | ----- |
| `relations: ['account']` | `relations: { account: true }` |
| `relations: ['playlist.account.account_profile']` | `relations: { playlist: { account: { account_profile: true } } }` |
| `select: ['id', 'guid']` | `select: { id: true, guid: true }` |

### Controller patterns

Many controllers pass `{ relations: [...] }` into `@podverse/orm` services. Convert inline objects and spread arrays:

```typescript
// Before
const config = { relations: [...publicRelations, 'sharable_status'] };

// After — if publicRelations is still string[], convert that source too
const config = {
  relations: {
    ...publicRelationsObject,
    sharable_status: true,
  },
};
```

Audit **`publicRelations` / `privateRelations`** constants in `apps/api/src/controllers/account/account.ts` — convert any string arrays to `FindOptionsRelations<Account>` objects.

### Parser select fields

```typescript
// Before
select: ['id', 'guid', 'guid_enclosure_url'],

// After
select: { id: true, guid: true, guid_enclosure_url: true },
```

### Workers and scripts

Both reencrypt files share the same select shape — keep them in sync:

```typescript
select: {
  account_id: true,
  feed_url: true,
  basic_auth_username: true,
  basic_auth_password: true,
},
```

## Steps

1. Convert `apps/api/src/lib/auth/index.ts` first (auth hot path).
2. Convert account controllers and shared relation constants.
3. Convert clip, playlist, queue, membership, profileContent, itemSoundbite controllers.
4. Convert `apps/api/src/lib/followed.ts`.
5. Convert parser files (relations + select).
6. Convert `adminAccount.ts` management-api service.
7. Convert workers + scripts select arrays.
8. Lint and build affected workspaces.

## Key files

| Path | Notes |
| ---- | ----- |
| `apps/api/src/controllers/account/account.ts` | `publicRelations` / `privateRelations` |
| `apps/api/src/lib/auth/index.ts` | Login/session load paths |
| `apps/api/src/controllers/clip.ts` | Large controller; multiple relation blocks |
| `apps/api/src/controllers/playlist/playlist.ts` | Nested playlist.account paths |
| `packages/parser/src/lib/rss/liveItem/liveItem.ts` | Parser transaction path |

## Deliverables

- [x] Zero string-array `relations` in apps, parser, scripts
- [x] Zero string-array `select` in apps, parser, scripts, workers (reencrypt files already object syntax)
- [x] Account relation constants converted to object syntax
- [x] Reencrypt worker/script selects aligned

## Verification

```bash
rg "relations: \[|select: \[" apps packages/parser scripts --glob '*.ts'
./scripts/nix/with-env npm run build -w @podverse/parser
./scripts/nix/with-env npm run build -w apps/api
./scripts/nix/with-env npm run lint:fix
```

Full-repo gate (should be clean after this plan):

```bash
rg "relations: \[|select: \[" --glob '*.ts' --glob '!**/.llm/**'
```

## Completion checklist

- [x] All 17 relations files converted (+ shared ORM exports `itemGetManyRelations*`, `channelGetManyRelations`, `subChannelGetManyRelations`)
- [x] All 4 select files converted
- [x] Repo-wide string relations/select grep is zero
- [x] API and parser build successfully
- [x] Entity fixes: `Clip.sharable_status`, `Queue.medium` typed as `Relation<>` for v1 find options
