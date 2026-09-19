# 744-multi-device-playback-handoff

**Master step:** P2.4.12
**Model (author + implement):** Opus 5
**Status:** done

## Scope

What the product does when the **same account is signed in on two devices** and the user opens the
second one while the first is, or recently was, playing.

This is a UX question first and a sync question second. The data work is
[743-offline-playback-reconciliation](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md),
which must land first. This detail decides what the user actually experiences.

## Current behavior (the gap)

- The server keeps **one active queue per account** (`is_active_queue`); setting now playing clears
  the flag on other queues.
- **Web** claims it during playback — it posts `update-is-active` and now-playing position as
  progress advances.
- **Mobile never writes either one.** It only reads. There are no calls to `update-is-active` or
  now-playing add from `apps/mobile`.

Consequences today: the phone resumes from wherever the last _completed_ history write left it
rather than where the laptop actually is; two devices can play different things with no indication;
and whichever device writes last silently wins.

## Decision

**Model B — resume prompt**, asked only when the **item** differs.

### A different position is not a conflict

When both sides name the **same item**, there is nothing to ask. The position from the most recent
meaningful event is simply adopted, silently. Being asked "switch or continue?" because another
device is forty seconds further into the episode you are already listening to is a prompt that
tells the user nothing and costs them a tap.

This is the same rule 743 applies everywhere else — most recent meaningful event wins — so the
same-item case needs no special handling at all. It falls out of the merge.

### A different item is a conflict

When the server's now-playing row names a **different item** and carries a newer meaningful-event
timestamp than the locally loaded one, the device asks:

- **Switch** — load and play what was last playing on the other device.
- **Continue** — keep what is loaded locally.

Only this case reaches the user, because only this case has an answer the app cannot derive. Which
of two different episodes someone wants to hear right now is not a function of timestamps.

### What happens to the loser

Whichever item is not chosen **moves into history**, carrying its own position and timestamp. It is
never discarded. On this schema that is a zone move of a single row, not a delete —
`UNIQUE (queue_id, item_id)` means an item is in exactly one zone at a time, so promoting one item
to now playing necessarily displaces the other, and history is where it belongs.

If the user chooses **Continue**, the local item is promoted to now playing on the server and the
server's previous now-playing item moves to history. The local choice takes precedence from that
point; it is a genuine meaningful event.

### Rules

- **Offer, never force.** A user who deliberately scrubbed back must not be yanked forward.
- **Never interrupt audio to ask.** If something is actively playing locally, the prompt does not
  appear — active playback is a continuous stream of meaningful events, so the local side is the
  most recent by construction and there is no conflict to resolve.
- **Switch starts playing** at the remote position. Tapping it is an intent to listen, not to load.
- **A dismissal is remembered against the specific remote state** it declined, so the prompt
  returns only when the other device plays something new. Choosing Continue counts as a dismissal.
- Same affordance on web, so the behavior is symmetric rather than a mobile quirk.
- A device in Offline Mode cannot observe or announce anything. It is never treated as the active
  device, and on leaving Offline Mode it reconciles rather than assuming its own state is current.

### Not chosen

- **Model A, silent last-write-wins** — the behavior this step removes. It is not shipped as an
  interim, because a silent swap of the loaded item is more surprising than either alternative.
- **Model C, exclusive active-device handoff** (opening device 2 pauses device 1) — needs device
  identity, a per-account device registry, and a realtime channel. A device that never receives the
  "you were superseded" signal keeps playing, which is worse than not trying. The data model from
  743 leaves C possible later.
- **Hard-locking playback to one device** — explicitly rejected. Podcast listening is not music
  streaming; a single-stream restriction would be user-hostile with no business reason.

## Settled sub-decisions

| #   | Question                                     | Answer                                                                                           |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | How much newer before prompting?             | **Not a threshold question.** Item differs → prompt. Item matches → adopt position               |
| 2   | Does the prompt reappear if dismissed?       | Only when the other device plays something **new**; the dismissal is keyed to the declined state |
| 3   | Does Switch play immediately or load paused? | **Plays**, at the remote position                                                                |

## Prerequisites

All from 743, which ships in the same plan set and must land first:

1. Mobile writes now-playing position during playback.
2. Clamped client meaningful-event timestamps, so "whose state is newer" is answerable.
3. Server-side now-playing conflict resolution by timestamp.

## Acceptance criteria

- Opening the app on device 2 after listening to a **different item** on device 1 surfaces the
  choice instead of silently resuming either side.
- Opening it after listening to the **same item** on device 1 resumes at the newer position with
  **no prompt**.
- The prompt never appears while audio is playing locally.
- The user is never force-moved without an affordance to decline.
- The declined item lands in history with its own position, never discarded.
- Choosing **Continue** promotes the local item to now playing on the server.
- Choosing **Switch** starts playback at the remote position.
- A dismissed prompt does not return for the same remote state, and does return once the other
  device plays something else.
- Two devices playing at once never corrupt history ordering; both listens land in the timeline.
- Behavior is the same on mobile and web, or the divergence is recorded as intentional.
- A device in Offline Mode cannot claim or lose the active role, and reconciles on return.

## Cross-surface impact

- **API / ORM** — whatever identifies "which device last wrote this", if a later model needs it.
- **Web** — same prompt and same claim semantics as mobile.
- **Mobile** — comparison on foreground, the prompt itself, and the promote-local path.

## Known gap after implementation

Dismissal is narrower than the criterion above. It is one device-local slot keyed to the remote item
**and** its timestamp, so a declined prompt returns whenever the other device plays on — not only
when it plays something else — and answering a prompt for one queue forgets the decision recorded
for another. Tracked in
[746-defer-handoff-dismissal-memory](/docs/proposals/mobile/_master-plan_/phase-2/details/746-defer-handoff-dismissal-memory.md).

Handoff also inherits the add-by-RSS gap from 743: mobile cannot produce an add-by-RSS timestamp, so
it can detect such a conflict but never win one. Tracked in
[745-defer-mobile-add-by-rss-playback-recording](/docs/proposals/mobile/_master-plan_/phase-2/details/745-defer-mobile-add-by-rss-playback-recording.md).

## Related

- [743-offline-playback-reconciliation](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md)
- [745-defer-mobile-add-by-rss-playback-recording](/docs/proposals/mobile/_master-plan_/phase-2/details/745-defer-mobile-add-by-rss-playback-recording.md)
- [746-defer-handoff-dismissal-memory](/docs/proposals/mobile/_master-plan_/phase-2/details/746-defer-handoff-dismissal-memory.md)
- [585-defer-offline-sync-advanced](/docs/proposals/mobile/_master-plan_/phase-1/details/585-defer-offline-sync-advanced.md)
- [742-offline-mode](/docs/proposals/mobile/_master-plan_/phase-2/details/742-offline-mode.md)
