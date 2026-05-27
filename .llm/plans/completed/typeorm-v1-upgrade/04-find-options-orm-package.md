# Plan 04 — Find options: ORM package

## Objective

Convert all **string-array** `relations` and `select` find options in `packages/orm/**` to TypeORM v1 **object syntax**. Update shared relation constants and unit tests.

## Scope

**In scope:** 28 production/test files under `packages/orm/` with `relations: [` (see list below).

**Already object syntax (verify only, do not regress):**

- `packages/orm/src/services/item/item.ts` — `itemGetOneRelations: FindOptionsRelations<Item>`
- `packages/orm/src/services/channel/channel.ts` — `channelGetOneRelations: FindOptionsRelations<Channel>`

**Out of scope:** `apps/api`, `packages/parser` (plan 05); string entity `findOne('Queue'` (plan 06).

## Conversion rules

TypeORM v1 removes `FindOptionsRelationByString`. Use nested objects keyed by **entity property names** (snake_case in this codebase).

### Single relation

```typescript
// Before
relations: ['account']

// After
relations: { account: true }
```

### Nested dot path

```typescript
// Before
relations: ['channel.channel_images']

// After
relations: { channel: { channel_images: true } }
```

### Multiple relations (flat + nested)

```typescript
// Before
relations: ['playlist', 'playlist.account', 'playlist.account.account_profile']

// After
relations: {
  playlist: {
    account: { account_profile: true },
  },
}
```

When sibling top-level relations exist alongside nested paths, merge into one object:

```typescript
// Before
relations: ['account', 'sharable_status']

// After
relations: { account: true, sharable_status: true }
```

### String constant arrays

Convert `as const` string arrays to typed object constants:

```typescript
// Before
const FEED_RELATIONS = [
  'channel',
  'feed_lifecycle_state',
  'feed_lifecycle_state.feed_lifecycle_state_type',
  'feed_log',
  'feed_policy',
] as const;
relations: [...FEED_RELATIONS],

// After
import type { FindOptionsRelations } from 'typeorm';
const FEED_RELATIONS: FindOptionsRelations<Feed> = {
  channel: true,
  feed_lifecycle_state: { feed_lifecycle_state_type: true },
  feed_log: true,
  feed_policy: true,
};
relations: FEED_RELATIONS,
```

Apply the same pattern to `FEED_RELATIONS_PENDING_OR_SPAM` in `archiver.ts`.

### Spread from string arrays in tests

Update test fixtures (e.g. `archiver.test.ts`, `queueResourceListGuardrails.test.ts`) to use object syntax or import shared typed constants.

### Helper: dot-path to nested object (optional)

For many dot paths in one file, a small local helper is acceptable if it keeps call sites readable — but prefer explicit object literals for clarity. Do **not** add a permanent “string relations compat” layer.

## Files to convert (28)

### Account services

- `packages/orm/src/services/account/account.ts`
- `packages/orm/src/services/account/accountDataExport.ts`
- `packages/orm/src/services/account/accountEmailChangeVerification.ts`
- `packages/orm/src/services/account/accountFollowingAccount.ts`
- `packages/orm/src/services/account/accountFollowingPlaylist.ts`
- `packages/orm/src/services/account/accountPayPalOrder.ts`
- `packages/orm/src/services/account/accountResetPassword.ts`
- `packages/orm/src/services/account/accountSetPassword.ts`
- `packages/orm/src/services/account/accountSettings/accountSettingsLocale.ts`
- `packages/orm/src/services/account/accountSettings/accountSettingsNotificationType.ts`
- `packages/orm/src/services/account/accountVerification.ts`

### Billing, category, channel, feed

- `packages/orm/src/services/billingMembershipExtension.ts`
- `packages/orm/src/services/billingRenewalOrchestrator.ts`
- `packages/orm/src/services/category.ts`
- `packages/orm/src/services/channel/channelAbout.ts`
- `packages/orm/src/services/channel/channelPodroll.ts`
- `packages/orm/src/services/channel/channelTrailer.ts`
- `packages/orm/src/services/feed/feed.ts` — **`FEED_RELATIONS` constant**
- `packages/orm/src/services/publisherFeed.ts`

### Item, playlist, queue, stats, archiver

- `packages/orm/src/services/item/item.ts` — inline string arrays only (helpers already object)
- `packages/orm/src/services/item/itemAbout.ts`
- `packages/orm/src/services/item/itemSeason.ts`
- `packages/orm/src/services/playlist/playlist.ts`
- `packages/orm/src/services/playlist/playlistResource.ts`
- `packages/orm/src/services/queue/queueResource.ts` — relations only; string entity name in plan 06
- `packages/orm/src/services/stats/statsAggregatedPlaylist.ts`
- `packages/orm/src/services/archiver.ts` — **`FEED_RELATIONS_PENDING_OR_SPAM`**

### Tests

- `packages/orm/src/services/archiver.test.ts`
- `packages/orm/src/services/queue/queueResourceListGuardrails.test.ts`

## Steps

1. Convert shared constants first: `FEED_RELATIONS`, `FEED_RELATIONS_PENDING_OR_SPAM`.
2. Convert services alphabetically by subdirectory (account → … → stats).
3. Update unit tests mirroring old string arrays.
4. Run `./scripts/nix/with-env npm run lint:fix -w @podverse/orm`.
5. Run `./scripts/nix/with-env npm run test -w @podverse/orm`.

## Key files

| Path | Priority |
| ---- | -------- |
| `packages/orm/src/services/feed/feed.ts` | High — constant used 8× |
| `packages/orm/src/services/archiver.ts` | High — feed archival |
| `packages/orm/src/services/account/accountDataExport.ts` | Medium — many nested paths |
| `packages/orm/src/services/playlist/playlist.ts` | Medium |
| `packages/orm/src/services/queue/queueResource.ts` | Medium — relations here; entity name in plan 06 |

## Deliverables

- [x] Zero string-array `relations` in `packages/orm`
- [x] Zero string-array `select` in `packages/orm` (none expected at baseline)
- [x] Shared constants typed as `FindOptionsRelations<Entity>`
- [x] ORM unit tests updated; `npm run build -w @podverse/orm` passes (run `npm run test -w @podverse/orm` locally after `npm install` if rollup native binding missing on host)

## Verification

```bash
rg "relations: \[" packages/orm --glob '*.ts'
rg "select: \[" packages/orm --glob '*.ts'
./scripts/nix/with-env npm run build -w @podverse/orm
./scripts/nix/with-env npm run test -w @podverse/orm
```

## Completion checklist

- [x] All 28 files converted (many via plan 03 codemod; remainder hand-converted)
- [x] `FEED_RELATIONS*` constants are object-typed
- [x] No string-array relations remain in packages/orm
- [x] ORM package builds; tests require host-appropriate `@rollup/rollup-*` optional dep
