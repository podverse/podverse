# 03 — API endpoints

**Detail:** [743](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md)
**Model:** Codex 5.3 · **Reasoning:** medium
**Workspace:** `apps/api`

Accept the client timestamp on every playback write and add a batch replay route.

## Existing surface

Routes: `apps/api/src/routes/queue.ts`. Controllers: `apps/api/src/controllers/queue/`
(`queueResource.ts`, `queueResourceItem.ts`, `queueResourceClip.ts`,
`queueResourceItemSoundbite.ts`, `queueResourceItemAddByRSS.ts`, `queue.ts`).

Today's now-playing body schema, repeated per resource type:

```typescript
export const queueResourceNowPlayingSchema = Joi.object({
  playback_position: Joi.number().min(0).optional(),
  media_file_duration: Joi.number().min(0).optional(),
  completed: Joi.boolean().optional(),
}).required();
```

Every per-queue route already runs auth plus `verifyQueueOwnership()`. Keep that unchanged.

## Extend the write schemas

Add to the now-playing, history, next, last, and between body schemas for **all four** resource
types:

```typescript
last_played_at: Joi.string().isoDate().optional(),
playback_event_kind: Joi.string().valid(...PLAYBACK_EVENT_KINDS).optional(),
```

Mirror the `last_seen_at: Joi.string().isoDate()` shape already used by
`apps/api/src/controllers/account/accountChannelSeen.ts`.

Both optional, so existing web and mobile builds keep working while they roll forward.

**Do not clamp in the controller.** Clamping lives in the ORM service boundary (prompt 02) so there
is exactly one implementation. The controller passes the raw ISO string through.

The four resource types currently duplicate near-identical schemas. Extract the shared fields into
one object in `apps/api/src/lib/validation/querySchemas.ts` next to `queueIdTextParamSchema` and
spread it, rather than editing the same three lines in four files.

## History ordering

`getHistoryResourcesByQueueIdText` in `apps/api/src/controllers/queue/queueResource.ts` needs no
logic change — ordering moved into the ORM service in prompt 02. Confirm the `{ data, meta }`
response shape and `getPaginationParams` behavior are untouched.

## New batch replay route

```text
POST /queue/:queue_id_text/playback-events/replay
```

- Auth plus `verifyQueueOwnership()`, same as its neighbors.
- Body: `{ events: [{ resource ref, playback_event_kind, last_played_at, playback_position,
  media_file_duration, completed }] }`.
- Validate with `.min(1).max(PLAYBACK_REPLAY_BATCH_LIMIT)`, matching the
  `CHANNEL_SEEN_MARK_BATCH_LIMIT` pattern in `accountChannelSeen.ts`.
- Each event names exactly **one** of item, clip, soundbite, or add-by-RSS — the same exclusivity
  the `queue_resource` CHECK constraint enforces. Express it in Joi with `.xor()`.
- Delegates to the batch service method from prompt 02, which applies events in clamped-timestamp
  order inside one transaction, under a per-queue advisory lock.
- Returns the resulting rows so the client can adopt server state without a second round trip.

No dedupe key on this route. The merge is idempotent by construction — replaying the same event
twice yields the same row. Put that in a comment on the controller so nobody adds one later.

## Removal tombstones

The existing `DELETE /queue/:queue_id_text/{resource}` routes are the replay target for offline
removals. Extend their param or body handling to accept `last_played_at`, and have the service skip
the delete when the row's current `last_played_at` is **newer** than the tombstone — that means the
item was played after it was removed offline, and the newer event wins.

This is the one place where "removal" and "zone move" must not be confused. A tombstone deletes; a
zone move does not reach these routes at all.

## Stats need no change

Buffered stats replay safely with **no API work at all**, because the endpoints are already
idempotent:

- `stats_track_event_item` carries `UNIQUE (account_guid, item_id)`, and the channel, clip,
  account, and playlist tables carry the equivalent.
- `BaseStatsTrackEventService._create` inserts with `.orIgnore()` — `ON CONFLICT DO NOTHING`.

So a row exists at most once per account-guid per entity within the retention window. These measure
**unique listeners**, not play counts, and replaying one is a no-op in Postgres.

Do **not** add `stats_event_id`, a Valkey dedupe layer, or a TTL. `assertListenStatsAllowed` in
`apps/api/src/lib/legal/listenStats.ts` continues to gate these unchanged, which also means a
replayed event respects **current** consent rather than consent at the time of listening — the
correct behavior, and free.

One nuance to leave alone unless it becomes a problem: `_create` stamps `created_at: new Date()`,
so a listen that happened offline is recorded at replay time. Because the unique constraint already
caps a user at one row per entity, the effect on rolling popularity windows is bounded to a shifted
timestamp on a single row. Not worth an API change in this work.

## OpenAPI

Update the spec for the new route and the extended bodies per
[`openapi-sync`](/.cursor/rules/openapi-sync.mdc) and the **swagger-openapi** skill.

## Tests

`apps/api/src/test/queue.test.ts` — follow the existing harness (`startTestApp` / `stopTestApp`,
`vi.hoisted` ORM service mocks, auth 401 / ownership 403 / validation 400 / happy path).

Cases:

1. Now-playing accepts a valid ISO `last_played_at`; a malformed one is 400.
2. The write still succeeds with the timestamp omitted.
3. Replay rejects an empty array and an array over the batch limit.
4. Replay rejects an event naming two resource types at once.
5. Replay requires auth and queue ownership.
6. A replayed batch produces the same state as applying the same events one at a time.
7. A removal tombstone older than the row's `last_played_at` does not delete.

No new stats tests — nothing in `apps/api/src/test/stats.track.test.ts` changes.

## Acceptance

- All four resource types accept the new fields through one shared schema object, not four copies.
- No clamping logic exists in `apps/api`.
- The replay route is transactional, ownership-checked, and batch-limited.
- No stats controller, schema, or test is modified.
- OpenAPI matches the implemented surface.
