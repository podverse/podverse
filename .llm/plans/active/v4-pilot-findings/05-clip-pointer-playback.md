# 05 — Playback rows that point at a clip keep the clip or say why not

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

## Rows

R5

## Runs after

04 (shares `copyAccountLibraryApply.ts`, `replayLegacyRows.ts`, `verifyAccount.ts`)

## Why

A v4 queue, history, or now-playing row can point at a mediaRef. `activeTarget` in
`copyAccountLibraryApply.ts` writes the clip only when the mediaRef is in `clipIds`, which holds
the account's own clips. Otherwise it writes the parent item and records nothing. The pilot had
40 such rows on 12 accounts: 25 official chapters or soundbites, and 15 clips owned by other users
(00-FINDINGS F3). The parent item was in the queue in every case, so listeners lose no episode,
but verify fails those accounts and the pointer to another user's clip is lost.

## Decision

For a playback row with a mediaRef that is not the account's own clip:

| mediaRef | Written | Pending row (`legacy_id` = mediaRef id, kind = the zone's kind) |
| --- | --- | --- |
| Another user's clip already in v5 (`clip.id_text` = mediaRef id) | the clip | none |
| Another user's clip not in v5 yet | the parent item | `unresolved`, reason `clip_not_copied` |
| Official (chapter or soundbite) | the parent item | `resolved`, reason `official_as_item` |

Replay finishes `clip_not_copied` rows once the clip exists. `official_as_item` rows are a record
only; replay does not read them (it reads `unresolved` rows and `resolved` rows with reason
`snapshot`).

## Files

- `apps/workers/src/commands/orm/v4Library/copyAccountLibraryApply.ts`
- `apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.ts`
- `apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.test.ts`
- `apps/workers/src/commands/orm/v4Library/replayLegacyRows.ts`
- `apps/workers/src/commands/orm/v4Library/replayLegacyRowsLib.ts`
- `apps/workers/src/commands/orm/v4Library/replayLegacyRowsLib.test.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/verifyAccount.test.ts`
- `docs/proposals/v4-to-v5-migration/05-id-mapping-and-catalog-seeding.md`
- `release-notes/scratchpad.md`

## 1. Copy: find other users' clips

In `writePlayback`, before the `consider` loop, load every clip whose `id_text` is a playback
mediaRef id and is not already in `clipIds`:

```sql
SELECT id, id_text FROM clip WHERE id_text = ANY($1::varchar[])
```

(the same query `replayPlayback` uses). Merge into a local map `playbackClipIds` and pass that to
`activeTarget` in place of `clipIds`. One query per account, not one per row.

## 2. Copy: classify the stand-in

Add a pure helper in `copyAccountLibraryLib.ts`:

```ts
export type ClipPointerOutcome =
  | { kind: 'clip' }
  | { kind: 'not_a_clip' }
  | { kind: 'stand_in'; status: 'unresolved'; reason: 'clip_not_copied' }
  | { kind: 'stand_in'; status: 'resolved'; reason: 'official_as_item' };

export function clipPointerOutcome(
  mediaRefId: string | null,
  mediaRef: { official: boolean } | undefined,
  clipWritten: boolean
): ClipPointerOutcome;
```

`not_a_clip` when the mediaRef id is null or blank; `clip` when `clipWritten`; `official_as_item`
when `mediaRef?.official === true`; otherwise `clip_not_copied` (this includes a mediaRef missing
from the snapshot, which replay can still find by id).

In `consider`, after `activeTarget` returns a target with `clipId === null` and the row has a
mediaRef id, call the helper. For a `stand_in`, add a pending row
`{ kind: PENDING_KIND_BY_ZONE[zone], legacyId: mediaRefId, status, reason, context }` where
`context` is `playbackContext(row)` plus `item_stand_in: true` when no other v4 playback row of
this account (any zone) names the same episode without a mediaRef, and `false` otherwise. Compute
the set of directly referenced episode ids once before the loop.

The row still competes for its item key in `chosen` exactly as today, so the queue gets one row
per item.

## 3. Replay: swap in the clip

In `replayLegacyRows.ts` `replayPlayback`, for a row with reason `clip_not_copied`:

- If `clipIds` (already loaded by `id_text`) has no clip: leave the row `unresolved` (no write).
- If the clip exists and `context.item_stand_in === true`: in one statement set, delete the queue
  row for the parent item and insert the clip row at that row's `list_position` and
  `last_played_at`, keeping `completed` and playback position; resolve the row.
- If the clip exists and `item_stand_in` is not true: fall through to the normal path, which
  inserts the clip row at the v4 position and leaves the item row.

Put the decision in a pure helper in `replayLegacyRowsLib.ts`
(`decideClipSwap(reason, clipFound, itemStandIn): 'wait' | 'swap' | 'insert' | 'normal'`) and
test it there. Keep the database work in `replayLegacyRows.ts`.

A `clip_not_copied` row whose clip owner is never copied (an email twin whose library is left out)
stays `unresolved`; the parent item already plays. Note that in the doc (§ 5).

## 4. Verify

No code change: `distinctPlayback` is covered by a `queue`, `history`, or `now_playing` pending
row with any status. Add `verifyAccount.test.ts` cases: a history row pointing at an official
mediaRef with a resolved `official_as_item` row passes; one pointing at another user's clip with
an unresolved `clip_not_copied` row passes; the same row with no pending row and no clip in the
queue fails.

## 5. Doc

In `05-id-mapping-and-catalog-seeding.md`, in the playback section, add the table from
§ Decision and the email-twin note.

## Tests

- `copyAccountLibraryLib.test.ts`: every branch of `clipPointerOutcome`.
- `replayLegacyRowsLib.test.ts`: every branch of `decideClipSwap`.
- `verifyAccount.test.ts`: the three cases in § 4.

## Release scratchpad

```markdown
## v4 queue and history rows that point at clips

- Surfaces: workers (v4 migration)
- Change: a v4 queue, history, or now-playing row that points at another user's clip is written as that clip when it is already copied, or as its episode until replay swaps the clip in. Official chapters and soundbites are written as their episode and recorded.
- Who notices: v4 users who queued or played other users' clips or chapters
- Operator steps: none
```
