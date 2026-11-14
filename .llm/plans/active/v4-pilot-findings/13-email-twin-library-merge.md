# 13 — The left-out email twin's library merges into the kept account

**Cursor model:** Cursor Opus 5.5 · **Reasoning:** high

## Rows

R13

## Runs after

06 (shares `copyAccountLibraryApply.ts`, `copyAccountLibrary.ts`, `verifyAccount.ts`) and 12
(shares `seedAccountIdentity.ts`). Needs plans 04–06 in place so merged follows, clips, and
history use the same pending rows and tiers.

## Why

v4 stores 50 addresses twice with different letter case. v5 keeps one account per lowercase
address. The identity seed keeps one v4 row by the rule in `_WAKE-UP.md` and drops the other
row's library. In 36 of the 50 pairs that row had use: subscriptions, playlists, clips, history
(00-FINDINGS F11). The operator chose to merge, to grandfather those users in.

Accounts keep their v4 id as `account.id_text`; playlists and clips keep theirs as `id_text`.
So the left-out row's playlists and clips can be written under the kept account with no id
clash.

## Decision

- The identity seed records each left-out v4 id in `legacy_id_map`: `legacy_kind = 'user'`,
  `legacy_id = <left-out id>`, `v5_kind = 'account'`, `v5_id_text = <kept account id_text>`,
  `status = 'mapped'`, `resolve_key = 'email_case_twin'`. No migration: these columns and values
  are allowed today.
- The library copy, given a v4 id with such a row, copies that v4 row's library into the kept
  account. Follows, Add by RSS, and playback already deduplicate; caps use the combined counts.
- The left-out row's membership, password, and email are not used. `_WAKE-UP.md` already
  records that no left-out row has a future paid expiry.
- Follows of the left-out user by others resolve to the kept account through the map row
  (replay `follow_account` and the copy's account lookup).
- The rehearsal runs library, replay, and verify for left-out ids after every kept id's library
  is done, and skips identity and membership for them.

## Files

- `apps/workers/src/commands/orm/v4Identity/seedAccountIdentity.ts`
- `apps/workers/src/commands/orm/v4Library/copyAccountLibrary.ts`
- `apps/workers/src/commands/orm/v4Library/copyAccountLibraryApply.ts`
- `apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.ts` and its test
- `apps/workers/src/commands/orm/v4Library/replayLegacyRows.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/rehearsalPhaseHandlers.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/runFullRehearsalLoop.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/verifyAccount.ts` and its test
- `docs/proposals/v4-to-v5-migration/_WAKE-UP.md` (the twin paragraph)
- `docs/proposals/v4-to-v5-migration/05-id-mapping-and-catalog-seeding.md`
- `release-notes/scratchpad.md`

## 1. Identity records the twin

In `seedAccountIdentity.ts`:

- `keep_current` (the incoming row is left out): upsert the map row for the incoming v4 id → the
  existing account's `id_text`.
- `replace` (the occupant is left out and the incoming row takes the account): upsert the map row
  for the occupant's old v4 id → the account's new `id_text`.
- Dry run writes nothing. `ON CONFLICT (legacy_kind, legacy_id) DO UPDATE` keeps re-runs stable.
- Keep the existing `blocked_library` and `blocked_grants` refusals.

## 2. Copy resolves the target account

`copyAccountLibrary.ts` and `copyAccountLibraryApply.ts` find the account by
`account.id_text = <v4 id>` today. Add one resolver used by both:

```ts
/** The account a v4 user's library is copied into, and whether it is a merge. */
export async function resolveLibraryTarget(db: Queryable, v4Id: string):
  Promise<{ accountId: number; accountIdText: string; merge: boolean } | null>;
```

Own account first; otherwise the `email_case_twin` map row. In merge mode:

- Do not require or set `account.v4_library_copied_at` (it belongs to the kept row's copy). Record
  completion in `account_phase_status` for the left-out v4 id, which the rehearsal already does.
  The standalone command refuses a merge until the kept account's `v4_library_copied_at` is set,
  so the merge always lands second.
- Cap tiers (directory follows, Add by RSS, queue size from plan 06): compute from the account's
  current rows plus the merged snapshot after deduplication, and keep the larger of the stored
  tier and the new one. Past the largest tier is `needs_operator`, as for a single account.
- Playlists and clips are written with `owner` = the kept account and their own v4 ids.
- Playback merges through the existing one-row-per-item rule against the rows already in the
  queue: a merged row wins only by the same zone and time rules `replayedPlaybackWins` uses.
  Reuse that helper rather than adding a second rule.
- The account-id lookup for user follows (`SELECT id, id_text FROM account WHERE id_text = ANY(...)`
  in the copy) also resolves ids through `email_case_twin` map rows, so following a left-out user
  follows the kept account. A follow of oneself (after the merge both ids are the same account)
  is skipped.

## 3. Replay

`follow_account` resolution resolves the legacy user id through the same map row. Replay for a
left-out v4 id works on the kept account's pending rows; pending rows keep `account_id` = the
kept account, so no other change.

## 4. Rehearsal

- `applyIdentityHold`: a left-out id with a map row gets identity `done` with the kept
  `accountId`, membership deferred with class `email_case_merged`, and library, replay, verify
  pending. A left-out id with no map row (dry run or an older seed) keeps today's
  `email_case_left_out` deferral.
- `runFullRehearsalLoop.ts`: in the library phase, run left-out ids after every other id in the
  run has a final library status. Replay and verify keep their order after library.

## 5. Verify

For a merged id, `verifyAccount.ts` judges only library coverage (follows, Add by RSS, playlists,
clips, playback) against the kept account, and skips identity and membership checks. Report it
with the same result classes. Tests: a merged id whose subscriptions and playlists are all in the
kept account passes; a missing merged playlist fails `unaccounted`.

## 6. Docs

- `_WAKE-UP.md`: replace "Its library is dropped, not merged, and only its v4 id is logged" with
  the merge rule, still counts only.
- `05-id-mapping-and-catalog-seeding.md`: document the `email_case_twin` map row.

## Tests

- `copyAccountLibraryLib.test.ts`: the combined-count tier choice keeps the larger tier.
- `verifyAccount.test.ts`: § 5 cases.
- A pure helper for § 4's left-out ordering if extracted.

## Release scratchpad

```markdown
## v4 email-case twins keep both libraries

- Surfaces: workers (v4 migration)
- Change: when v4 stored one address twice with different letter case, the library of the row that does not become the account (subscriptions, playlists, clips, Add by RSS, history) is merged into the account that does. Follows of either v4 user resolve to that account.
- Who notices: about 50 v4 users whose address was stored twice; 36 had use on both rows
- Operator steps: none
```
