# 09 — Large v4-subscribed feeds get the higher body limit once

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

## Rows

R9

## Runs after

08 (shares `runDue.ts` `handleV4MigrationFeedRetry` and the scheduler)

## Why

32 pilot feeds were over `PARSER_MAX_FEED_BODY_BYTES` (20 MiB): large, active shows on Omny,
Megaphone, Simplecast, and others (00-FINDINGS F8). About 250 shows at full scale. A too-large
body sets the `OversizedDetected` feed condition (`parser.ts` catch block), and
`computeEffectivePolicyFromConditionKeys` turns that into `parseAllowed = false`. The migration
retry handler then cancels the job with `Feed may not be parsed`, so the show never gets episodes
and v4 subscribers see an empty show. `feed.max_response_body_bytes_override` (up to
`PARSER_MAX_FEED_BODY_BYTES_MAX`, 50,000,000) exists for exactly this, but only an operator sets it.

## Decision

Only in the v4 migration retry handler: when the feed's last failure is `body_too_large` (or its
`OversizedDetected` condition is active) and its override is below `PARSER_MAX_FEED_BODY_BYTES_MAX`,
set the override to `PARSER_MAX_FEED_BODY_BYTES_MAX`, clear the `OversizedDetected` condition,
refresh the feed policy, and parse. A second `body_too_large` at the maximum is permanent: the
parser sets the condition again and the job fails with reason `body_too_large`. Ordinary v5
parsing is unchanged.

## Files

- `apps/workers/src/commands/orm/scheduledJob/runDue.ts`
- `apps/workers/src/commands/orm/scheduledJob/v4MigrationFeedOversize.ts` (new pure helper) and its test
- `packages/orm/src/services/feed/` — reuse `FeedService.update` and `FeedPolicyService.setCondition`; add nothing unless one is missing
- `apps/workers/src/commands/orm/v4Catalog/seedStageCatalog.ts` (count for the summary)
- the rehearsal summary writer
- `release-notes/scratchpad.md` (only through the final message)

## 1. Pure decision

```ts
export function decideMigrationOversize(input: {
  lastFailureReason: FeedParseFailureReason | null;
  oversizedConditionActive: boolean;
  currentOverride: number | null;
}): 'raise' | 'give_up' | 'none';
```

- `none` unless `lastFailureReason === 'body_too_large'` or `oversizedConditionActive`.
- `raise` when `currentOverride === null || currentOverride < PARSER_MAX_FEED_BODY_BYTES_MAX`.
- `give_up` otherwise.

## 2. Handler

In `handleV4MigrationFeedRetry`, before `cancelledWhenFeedMayNotBeParsed(feed)`:

1. Read the reason (plan 08's `readFeedLastParseOutcome`) and whether `OversizedDetected` is
   active (from `feed.feed_policy` or the condition table; use whatever `cancelledWhenFeedMayNotBeParsed`
   already loads).
2. `raise`: `FeedService.update(feed.id, { max_response_body_bytes_override: PARSER_MAX_FEED_BODY_BYTES_MAX })`,
   `setCondition({ feedId, conditionKey: OversizedDetected, isActive: false, source: Auto, note: 'v4 migration raised body limit' })`,
   `refreshFeedPolicy(feed.id)`, reload the feed, then continue to the gate and the parse.
3. `give_up`: return `{ outcome: 'failed', reason: 'body_too_large' }`.

A manual block, takedown, or spam condition still cancels the job through the gate, as today.

## 3. Report

Add `oversizeRaised` and `oversizeGaveUp` counts to the catalog result (from feeds whose override
equals the maximum and whose last reason is or is not `body_too_large`) and show them in the
rehearsal summary. Counts only.

## Tests

- `v4MigrationFeedOversize.test.ts`: every branch, including an override already at the maximum
  with the condition active (`give_up`) and a null reason with no condition (`none`).

## Release scratchpad

This prompt shares its phase with another, so put this entry in the final message under
"Release notes entry" instead of writing the file:

```markdown
## Large v4-subscribed feeds parse during migration

- Surfaces: workers (v4 migration)
- Change: a v4 migration feed blocked for a body over the parser limit gets the maximum body limit (50,000,000 bytes) and one more parse. If it is still too large it fails with reason `body_too_large`. Ordinary parsing is unchanged.
- Who notices: v4 subscribers of very large shows (about 250 at full scale) who would otherwise see them empty
- Operator steps: none
```
