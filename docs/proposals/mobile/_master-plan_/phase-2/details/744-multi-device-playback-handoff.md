# 744-multi-device-playback-handoff

**Master step:** P2.4.12
**Model (author + implement):** TBD
**Status:** planned — **important**, not yet built

## Scope

What the product should do when the **same account is signed in on two devices** and the user opens
the second one while the first is (or recently was) playing.

This is a UX question first and a sync question second. The data work is
[743-offline-playback-reconciliation](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md);
this detail decides what the user actually experiences.

## Current behavior (the gap)

- The server keeps **one active queue per account** (`is_active_queue`); setting now-playing clears
  the flag on other queues.
- **Web** claims it during playback — it posts `update-is-active` and now-playing position as
  progress advances.
- **Mobile never writes either one.** It only reads. There are no calls to `update-is-active` or
  now-playing add from `apps/mobile`.

Consequences today:

1. Open the phone after listening on the laptop and the phone resumes from wherever the **last
   completed** history write left it — not where the laptop actually is.
2. Two devices can play different things simultaneously with no indication to the user.
3. Whichever device happens to write last silently wins, and the other device's position is
   overwritten with no notice.

There is **no** device identity, no session, and no concept of "another device is playing".

## The UX question

Three plausible models. **This needs a product decision before implementation.**

| Model | Behavior | Cost |
| ----- | -------- | ---- |
| **A. Silent last-write-wins** (today) | Both play; last write wins | Cheapest; loses position silently, confusing |
| **B. Resume prompt** (recommended starting point) | Second device notices newer remote progress and offers "Continue from your other device — 42:15" | Honest, non-blocking, no realtime infra |
| **C. Active-device handoff** | Opening playback on device 2 pauses device 1 | Matches Spotify; needs realtime push and careful failure modes |

**Recommended:** B now, with the data model built so C remains possible. C without realtime
delivery degrades badly — a device that never receives the "you were taken over" signal keeps
playing, which is worse than not trying.

Explicitly **not** recommended: hard-locking playback to one device. Podcast listening is not music
streaming; a licensing-style single-stream restriction would be user-hostile and there is no
business reason for it.

### What B looks like

- On foreground / playback start, the device compares its local position for the current item
  against the server's.
- If the server is **meaningfully** further along (threshold, not a second or two) and was updated
  recently by a different device, offer to jump there.
- Offer, never force. A user who deliberately scrubbed back must not be yanked forward.
- Same affordance on web, so the behavior is symmetric rather than a mobile quirk.

### What C needs, if pursued later

- Device identity and a per-account device registry (push registration already exists as a
  starting point).
- A realtime or push channel to tell the previous device it was superseded.
- A defined answer for a device that is offline when it is superseded — it will still hold a claim
  and must lose gracefully on reconnect rather than stomping the newer position.

## Interaction with Offline Mode

A device in Offline Mode
([742-offline-mode](/docs/proposals/mobile/_master-plan_/phase-2/details/742-offline-mode.md)) cannot
observe or announce anything. It must not be treated as the active device, and on leaving Offline
Mode it must reconcile rather than assume its own state is current. This makes the recommendation
above sharper: a model built on cooperative claims fails the moment a device chooses not to talk.

## Prerequisites

1. Mobile writes now-playing position during playback (currently missing entirely).
2. Client-stamped listen times, so "whose position is newer" is answerable —
   [743](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md).
3. A recorded product decision between A, B, and C.

## Acceptance criteria (draft, pending model choice)

- Opening the app on device 2 after listening on device 1 surfaces the newer position instead of
  silently resuming an older one.
- The user is never force-moved without an affordance to decline.
- Two devices playing at once never corrupt history ordering; both listens land in the timeline.
- Behavior is the same on mobile and web, or the divergence is recorded as intentional.
- A device in Offline Mode cannot claim or lose the active role, and reconciles on return.

## Cross-surface impact

- **API / ORM** — whatever identifies "which device last wrote this", if the chosen model needs it.
- **Web** — same prompt and same claim semantics as mobile.
- **Mobile** — now-playing writes, comparison on foreground, the prompt itself.

## Related

- [743-offline-playback-reconciliation](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md)
- [585-defer-offline-sync-advanced](/docs/proposals/mobile/_master-plan_/phase-1/details/585-defer-offline-sync-advanced.md)
- [742-offline-mode](/docs/proposals/mobile/_master-plan_/phase-2/details/742-offline-mode.md)
