**Cursor model:** Codex 5.3 · **Reasoning:** high

# 71 — Scheduled jobs for remote stub re-check, re-point, and promote

The admin actions on a remote stub (re-check against the provider now, re-point to another
provider feed id, promote to a full parse) run in workers as scheduled jobs. Management-api only
queues them (plan 72), so it needs no Podcast Index credentials and no `@podverse/parser`
dependency. `scheduledJobsRunDue` runs every 5 minutes, so an action lands within minutes.

## Rows

R38, R39, R41

## Runs after

11, 20, 70

## Files

packages/orm/src/services/remoteStub/remoteStubJobScheduler.ts
packages/orm/src/services/remoteStub/remoteStubJobScheduler.test.ts
packages/orm/src/index.ts
apps/workers/src/lib/remoteStubs/remoteStubActions.ts
apps/workers/src/lib/remoteStubs/remoteStubActions.test.ts
apps/workers/src/commands/orm/scheduledJob/runDue.ts
apps/workers/src/commands/orm/scheduledJob/runDue.test.ts
release-notes/scratchpad.md

## Job contract — `remoteStubJobScheduler.ts` (new)

Model the file on `packages/orm/src/services/feed/feedForceReparseScheduler.ts` (constants, a
dedupe-key builder, a payload type guard parser, a schedule function over
`ScheduledJobService.upsertByDedupeKey`). Import `IndexProviderId` and `isIndexProviderId` from
`@podverse/helpers` (plan 10).

```ts
export const REMOTE_STUB_RECHECK_JOB_TYPE = 'remote-stub-recheck';
export const REMOTE_STUB_REPOINT_JOB_TYPE = 'remote-stub-repoint';
export const REMOTE_STUB_PROMOTE_JOB_TYPE = 'remote-stub-promote';

export type RemoteStubRecheckPayload = { remoteChannelStubId: number };
export type RemoteStubRepointPayload = { remoteChannelStubId: number; targetProviderFeedId: string };
export type RemoteStubPromotePayload = { indexProvider: IndexProviderId; providerFeedId: string };

export const buildRemoteStubRecheckDedupeKey = (remoteChannelStubId: number): string;
// `remote-stub-recheck:<id>`
export const buildRemoteStubRepointDedupeKey = (remoteChannelStubId: number): string;
// `remote-stub-repoint:<id>`
export const buildRemoteStubPromoteDedupeKey = (
  indexProvider: IndexProviderId,
  providerFeedId: string
): string;
// `remote-stub-promote:<indexProvider>:<providerFeedId>`

export const parseRemoteStubRecheckPayload: (
  payload: Record<string, unknown> | null | undefined
) => RemoteStubRecheckPayload | null;
export const parseRemoteStubRepointPayload: (…) => RemoteStubRepointPayload | null;
export const parseRemoteStubPromotePayload: (…) => RemoteStubPromotePayload | null;

export const scheduleRemoteStubRecheck: (remoteChannelStubId: number) => Promise<ScheduledJob>;
export const scheduleRemoteStubRepoint: (
  remoteChannelStubId: number,
  targetProviderFeedId: string
) => Promise<ScheduledJob>;
export const scheduleRemoteStubPromote: (
  indexProvider: IndexProviderId,
  providerFeedId: string
) => Promise<ScheduledJob>;
```

- Ids are positive integers; `targetProviderFeedId` and `providerFeedId` are non-empty trimmed
  strings of at most 50 characters (`provider_feed_id` is `varchar_short`, `VARCHAR(50)`). The parsers
  return null for anything else.
- Every schedule function uses `run_after: new Date()` and `max_attempts: 3`.
- Promote is keyed by provider feed id, not stub id: the stub row is deleted when the parse
  succeeds, and a promote queued twice for the same feed is one job.
- `upsertByDedupeKey` resets status to pending but keeps `attempts`. A job that already used its
  attempts gets one try when an admin queues it again; that is acceptable for manual actions and
  is not changed here.
- Export the file from `packages/orm/src/index.ts` next to
  `export * from './services/feed/feedForceReparseScheduler.js';`.

## Worker actions — `apps/workers/src/lib/remoteStubs/remoteStubActions.ts` (new)

```ts
export const REMOTE_STUB_RECHECK_MAX_SINGLE_LOOKUPS = 25;

export type RemoteStubActionResult =
  | 'refreshed'
  | 'repointed'
  | 'deleted_parsed'
  | 'deleted_not_found'
  | 'deleted_retired'
  | 'target_not_found'
  | 'unavailable'
  | 'missing';

export async function recheckRemoteChannelStub(
  provider: IndexProvider,
  remoteChannelStubId: number,
  options: { rateLimitDelayMs: number }
): Promise<RemoteStubActionResult>;

export async function repointRemoteChannelStub(
  provider: IndexProvider,
  remoteChannelStubId: number,
  targetProviderFeedId: string
): Promise<RemoteStubActionResult>;
```

Import `resolveRemoteStubsForRefs` and `RemoteStubRef` from `@podverse/parser` (plan 20 exports
them), and `RemoteChannelStubService` and `FeedService` from `@podverse/orm`. A private helper
`isParsedByPodverse(feed: IndexProviderFeed): Promise<boolean>` returns true when
`feed.indexProvider === 'podcast_index'` and
`new FeedService().getByPodcastIndexId(Number(feed.providerFeedId))` is non-null. Use an exhaustive
`switch` on `feed.indexProvider` so a second provider is a compile error here.

### `recheckRemoteChannelStub`

1. `stub = getByIdWithRelations(id)` (plan 70); null → `'missing'`.
2. Refs:
   - One per alias: a `feed_guid` alias → `{ feedGuid: key_value, feedUrl: null, itemGuid: null }`;
     a `feed_url` alias → `{ feedGuid: null, feedUrl: key_value, itemGuid: null }`.
   - One per item stub, keyed on the first `feed_guid` alias when there is one, otherwise the first
     `feed_url` alias: `{ feedGuid, feedUrl, itemGuid: item_guid }`.
   - No aliases → skip to step 5.
3. `startedAt = new Date()`, then `resolveRemoteStubsForRefs(provider, refs, { rateLimitDelayMs,
   maxSingleLookups: REMOTE_STUB_RECHECK_MAX_SINGLE_LOOKUPS, refreshAfterMs: 0 })`.
4. Reload with `getByIdWithRelations(id)` and decide, in this order:
   - Gone → `'repointed'`. Plan 70's orphan cleanup removed it because every alias moved to the
     stub the provider now returns.
   - `resolved_at >= startedAt` → `'refreshed'` (the resolver wrote this stub). Do not read this
     from the outcomes: an `unavailable` lookup also returns the stale stub as `stub`.
   - Any outcome `unavailable` → `'unavailable'`.
   - Any outcome `stub` (it names another stub) → `deleteById` → `'repointed'`. The aliases that
     stayed on this stub resolved to nothing, so nothing should render through it.
   - Any outcome `parsed` → `deleteById` → `'deleted_parsed'`.
   - Otherwise (only `not_found` and `skipped`) → step 5.
5. `provider.getFeedById(stub.provider_feed_id)`:
   - `unavailable` → `'unavailable'`.
   - `not_found` → `deleteById` → `'deleted_not_found'`.
   - `found` with `isDead` → `deleteById` → `'deleted_retired'`.
   - `found` and `isParsedByPodverse` → `deleteById` → `'deleted_parsed'`.
   - `found` → `upsertChannelStub(feed, [])` → `'refreshed'`. The provider still has the id even
     though the reference keys no longer resolve to it (for example, the feed changed its GUID),
     so the existing aliases keep rendering it.

### `repointRemoteChannelStub`

1. `stub = getByIdWithRelations(id)`; null → `'missing'`.
2. `provider.getFeedById(targetProviderFeedId)`:
   - `unavailable` → `'unavailable'`.
   - `not_found`, or `found` with `isDead` → `'target_not_found'`; the stub is untouched.
   - `found` and `isParsedByPodverse` → `deleteById(stub.id)` → `'deleted_parsed'`. References
     matching the parsed channel by GUID or URL render it; others stop rendering.
   - `found` → `repointToFeed(stub.id, feed)` (plan 70); null → `'missing'`, else `'repointed'`.

## Handlers — `runDue.ts`

Add three handlers and register them in `jobHandlers` next to `[FEED_FORCE_REPARSE_JOB_TYPE]`.
Build the provider with `getIndexProvider()` from `@workers/factories/indexProvider.js` (plan 10)
and the delay from `getPodcastIndexConfig().rateLimitDelay ?? 0` (`@workers/config/index.js`).

- **`handleRemoteStubRecheck`**: invalid payload → `throw new Error('Invalid remote-stub-recheck
  payload')` (matches `handleFeedForceReparse`). Call `recheckRemoteChannelStub`. `'missing'` →
  `{ outcome: 'cancelled', reason: 'Remote stub not found' }`. `'unavailable'` → `throw new
  Error('Index provider unavailable')` so the loop requeues with backoff. Anything else →
  `logger.info` with the stub id and result, then `{ outcome: 'completed' }`.
- **`handleRemoteStubRepoint`**: same shape with `repointRemoteChannelStub`. `'target_not_found'` →
  `{ outcome: 'cancelled', reason: 'Target provider feed not found' }`.
- **`handleRemoteStubPromote`**: invalid payload → throw. `switch (payload.indexProvider)`, with
  `case 'podcast_index'`:
  - `podcastIndexId = Number(payload.providerFeedId)`; not a positive integer → cancelled
    `'Invalid Podcast Index feed id'`.
  - `existing = await new FeedService().getByPodcastIndexId(podcastIndexId)`. When it exists and
    the lifecycle and policy check fails, return the same cancelled result
    `handleFeedForceReparse` returns. Extract that check (lifecycle key read plus
    `shouldAttemptFeedParseFromLifecycleAndPolicy`) into one private function both handlers call
    instead of copying it.
  - `await parsePodcastIndexFeedDirectly(podcastIndexId, true, { enqueueFollowUpWork: true,
    suppressNewItemSideEffectsPublishedBeforeMs: job.created_at.getTime() })`, then
    `{ outcome: 'completed' }`. A successful full parse deletes the stub (plan 20,
    `deleteRemoteStubsForParsedFeed`), so promotion needs no stub write here. Errors propagate so
    the loop retries.

## Tests

- `remoteStubJobScheduler.test.ts`: dedupe keys per job type; each parser rejects a missing,
  non-integer, zero, or empty value and an unknown provider; each schedule function calls
  `upsertByDedupeKey` with its key, type, payload, and `max_attempts: 3` (mock
  `ScheduledJobService` the way the force-reparse scheduler's callers' tests do).
- `remoteStubActions.test.ts` (mock `@podverse/orm` and `@podverse/parser`; a fake provider):
  - Re-check: missing; reload gone → repointed; fresh `resolved_at` → refreshed; a stale `stub`
    outcome plus `unavailable` → unavailable with no delete; another stub → delete + repointed;
    `parsed` → delete + deleted_parsed; only `not_found` then `getFeedById` found → upsert +
    refreshed, `not_found` → deleted_not_found, `isDead` → deleted_retired, parsed →
    deleted_parsed; the core is called with `refreshAfterMs: 0` and the lookup cap; item refs use
    the GUID alias.
  - Re-point: missing; unavailable; `not_found` and `isDead` → target_not_found with no write;
    parsed → delete; found → `repointToFeed`.
- `runDue.test.ts` (extend): each new type is dispatched; recheck `'missing'` cancels; recheck
  `'unavailable'` requeues; repoint `'target_not_found'` cancels; promote calls
  `parsePodcastIndexFeedDirectly` with force and the job's `created_at`; promote of a feed whose
  lifecycle blocks parsing cancels without parsing; promote with an invalid id cancels.

## Release scratchpad

```markdown
## Workers run remote stub admin actions

- Surfaces: workers (`scheduledJobsRunDue`), orm
- Change: three scheduled job types, `remote-stub-recheck`, `remote-stub-repoint`, and
  `remote-stub-promote`. Re-check looks the stub up again now and refreshes, re-points, or removes
  it; re-point moves a stub's lookup keys and item rows to a provider feed id an admin chose;
  promote runs a forced full parse of the stub's feed, which then replaces the stub. An unreachable
  index retries with the usual backoff.
- Who notices: admins using the remote stub tools in management
- Operator steps: none; the existing `scheduledJobsRunDue` cron runs them
```
