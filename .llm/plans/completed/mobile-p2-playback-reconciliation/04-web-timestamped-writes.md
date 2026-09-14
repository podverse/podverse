# 04 — Web timestamped writes

**Detail:** [743](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md)
**Model:** Codex 5.3 · **Reasoning:** medium
**Workspace:** `apps/web`

May run in parallel with prompt 05 — different app, no shared files.

## Why web is in this plan set

History ordering moves from `list_position` to `last_played_at`. If web keeps posting undated
writes, its rows land with a server-receipt timestamp while mobile's land with true listen times,
and the merged timeline is wrong again for anyone who uses both. Splitting this to a later plan set
would ship a half-dated timeline
([`cross-surface-change-impact`](/.cursor/rules/cross-surface-change-impact.mdc)).

## What web does today

`apps/web/src/hooks/useQueueResourceUpdateNowPlaying.tsx` — on each call, for a signed-in user with
a matching queue, it fires `reqQueueUpdateIsActiveQueue(...)`, sets the active queue locally, then
posts `reqQueueResource{Clip|Item|ItemSoundbite}AddNowPlaying` with `playback_position` and
`media_file_duration`.

It is called from:

| Trigger              | Where                                                                            |
| -------------------- | -------------------------------------------------------------------------------- |
| Playback load        | `apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx` — once, with initial seek   |
| Every 15s of playback | `apps/web/src/components/MediaPlayer/Controller/NonLiveMediaOrchestrator.tsx`    |
| Pause                | Same orchestrator                                                                 |
| Add-by-RSS           | `apps/web/src/hooks/useAddByRSSPositionSave.tsx`                                  |

History moves go through `apps/web/src/hooks/useQueueResourceMoveNowPlayingToHistory.tsx`.

Web's 15-second cadence is what mobile is matching, so no cadence change is needed here.

## Changes

### Classify the event at the call site

Every caller of `updateNowPlaying` must say **what happened**, using `PlaybackEventKind` from
`@podverse/helpers`. Add a required `eventKind` to the hook's argument object so a new call site
cannot silently omit it.

| Call site                                    | `eventKind`      |
| -------------------------------------------- | ---------------- |
| Initial load in `useMediaPlayerResourceUpdate` | `play`         |
| 15s interval in the orchestrator             | `progress_tick`  |
| Pause in the orchestrator                    | `pause`          |
| Seek or scrub                                | `seek`           |
| `useQueueResourceMoveNowPlayingToHistory`    | `complete` or `skip` |

The history hook already distinguishes track-end from user-skip at its call sites; carry that
distinction rather than collapsing both to `complete`.

### Guard the tick

`progress_tick` is meaningful **only while playing**. Route the decision through
`isMeaningfulPlaybackEvent(kind, { isPlaying })` from `@podverse/helpers` rather than reimplementing
the check — this is the shared definition prompt 01 exists to protect. If the guard returns false,
skip the write entirely; do not post an unmeaningful event with a timestamp.

### Stamp the timestamp

Capture the ISO timestamp **when the event happens**, not when the request is built. On web these
are nearly identical, but the field means "when the user listened" and the code should read that
way, because prompt 06 depends on the same semantics where the gap is real.

Pass `last_played_at` and `playback_event_kind` in the request body alongside the existing
`playback_position` and `media_file_duration`.

### Add-by-RSS

`useAddByRSSPositionSave` posts through
`reqQueueResourceItemAddByRSSAddNowPlaying` on the same 15s-plus-pause rhythm. Give it the same
treatment — it is a real listen and must not be the one undated path.

### Seek

Check whether web currently posts on seek at all. If it does not, **add it** — a deliberate scrub
is one of the strongest position signals there is, and leaving it out means a user who scrubs and
immediately switches devices loses the scrub. Keep the change minimal: post the same now-playing
body with `eventKind: 'seek'`.

## Stats

No change. `apps/web/src/utils/statsTracking/statsTracking.ts` stays as it is — the stats endpoints
are already idempotent server-side (`UNIQUE (account_guid, <entity>_id)` plus `.orIgnore()`), and
web never buffers or replays anyway.

## Not in scope

- The "continue here or switch devices?" prompt — that is
  [744](/docs/proposals/mobile/_master-plan_/phase-2/details/744-multi-device-playback-handoff.md).
- Any offline behavior on web. Web has no offline download library; that divergence is intentional
  and recorded.
- Changing web's 15-second cadence.

## Tests

Unit tests in `apps/web` for the hook, scoped with `npm run test -w apps/web`:

1. A `progress_tick` while paused posts nothing.
2. A `progress_tick` while playing posts with `playback_event_kind` and an ISO `last_played_at`.
3. Pause posts with `eventKind: 'pause'`.
4. A track ending posts `complete`; a user skip posts `skip`.
5. Add-by-RSS saves carry the timestamp.

No E2E screenshot report is needed — there is no visual change. Prompt 08 covers the cross-surface
E2E.

## Acceptance

- Every playback write from web carries `last_played_at` and `playback_event_kind`.
- The meaningful-event guard comes from `@podverse/helpers`, not a local reimplementation.
- `eventKind` is required by the hook signature, so a future call site cannot omit it.
- Add-by-RSS is not left as an undated path.
- No visual or behavioral change for a single-device user.
