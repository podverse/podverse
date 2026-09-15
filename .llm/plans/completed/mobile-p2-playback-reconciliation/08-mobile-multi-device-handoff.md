# 08 — Multi-device handoff prompt

**Master step:** P2.4.12
**Cursor model:** Opus 5 · **Reasoning:** high
**Detail:** [744-multi-device-playback-handoff](/docs/proposals/mobile/_master-plan_/phase-2/details/744-multi-device-playback-handoff.md)

## Goal

Replace silent now-playing conflict resolution with a user choice, on mobile and web.

Prompt 07 reconciles playback state and returns any now-playing disagreement **as data** without
touching what is loaded in the player. This prompt is what consumes that data.

## The only case that prompts

| Server now-playing vs. local loaded | Behavior                                              |
| ----------------------------------- | ----------------------------------------------------- |
| Same item, any position             | **No prompt.** Adopt the position from the most recent meaningful event |
| Different item, server newer        | **Prompt**                                            |
| Different item, local newer         | No prompt. Local already won the merge                |
| Audio playing locally               | **No prompt**, whatever the server says               |

The same-item case needs no code. It is the ordinary merge from prompt 01
(`mergePlaybackState`) and it already produces the right position. Do not add a threshold, a
position-delta comparison, or a second prompt variant for it — the absence of that machinery is
the decision.

The playing-locally case also needs no special timestamp logic, but **does** need an explicit
guard. Active playback emits `progress_tick` continuously, so the local side holds the newest
timestamp by construction and no conflict should arise. Assert that rather than trust it: never
present this prompt, and never load a different item into the engine, while `isPlaying` is true.

## Shared decision helper

Add to `packages/helpers` alongside the prompt-01 functions, as a pure function:

```typescript
resolveHandoffDecision({ localItemIdText, localLastPlayedAt, serverItemIdText, serverLastPlayedAt, isPlayingLocally })
  => { kind: 'none' } | { kind: 'adopt_position' } | { kind: 'prompt'; serverItemIdText: string }
```

Both clients call this. Do not implement the comparison twice — the whole point of routing it
through `@podverse/helpers` is that web and mobile cannot disagree about when a user gets asked.

Unit-test the full matrix above, including the `isPlayingLocally` short-circuit and both
argument orders.

## Mobile

### Where the check runs

`PlaybackProvider` already owns the loaded target and the auth/queue refs. Do **not** add a new
foreground listener — `SyncProvider` (`apps/mobile/src/sync/SyncProvider.tsx`) already fires on
`app-foreground` and `connectivity-restored`, which are exactly the moments a conflict becomes
visible, and prompt 07's `playback-replay` job runs on the same triggers.

Have the reconcile step publish its result, and have a small hook read it and present the prompt.
Keep the comparison out of the 500 ms `progress` handler — this is a foreground-and-reconnect
concern, not a per-tick one
([`mobile-progress-ux-and-notification-channels`](/.cursor/rules/mobile-progress-ux-and-notification-channels.mdc)).

### Presentation

Reuse the existing dialog affordance rather than building one. Check
`apps/mobile/src/components/**` for the confirm-dialog used by membership gating (`openGate`) and
follow **mobile-reusable-components**; extract a shared component only if what exists genuinely
does not fit.

Copy goes through i18n ([`i18n-user-facing-strings`](/.cursor/rules/i18n-user-facing-strings.mdc)).
Prefer keys in `shared` or `consumer` so web reuses them — this dialog exists on both surfaces.
Name the two actions for what they do, not "OK" and "Cancel", and give the dialog an accessible
name and role ([`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc)).

Show what the user is choosing between: both episode titles. A prompt that says only "continue
here?" cannot be answered.

### Switch

1. Load the server's item and **start playing** at the remote position.
2. The displaced local item moves to history with its own position and timestamp — a zone move of
   one row, never a delete, and never a removal tombstone (prompt 05's rule).

### Continue

1. Promote the local item to now playing on the server, with a fresh meaningful-event timestamp.
   This is a genuine user action, so it legitimately wins from this point.
2. The server's previous now-playing item moves to history.

### Remembering a dismissal

Key the dismissal to the **declined remote state**, not to a time window, so the prompt returns
when the other device plays something else and stays away otherwise. The natural key is the
declined item's id plus its meaningful-event timestamp.

Store it device-locally — this is a UI preference, not account state. `apps/mobile/src/prefs/`
holds this kind of value; do not add a column or an endpoint for it. Choosing **Continue** records
a dismissal too.

## Web

Same affordance, same helper, same i18n keys. Web already posts `update-is-active` and now-playing
position during playback, so it has the data; it needs the comparison and the dialog.

Find the existing now-playing update path from prompt 04 (`useQueueResourceUpdateNowPlaying` and
its callers) and add the check where web learns the server state, not on a timer. Use the shared
modal from `@podverse/ui` with app-supplied strings
([`shared-ui-i18n`](/.cursor/rules/shared-ui-i18n.mdc),
[`modal-layout-contract`](/.cursor/skills/modal-layout-contract/SKILL.md)).

If web's structure makes the parity awkward, say so in the response rather than shipping a mobile
quirk — the decision is that this is symmetric.

## Tests

Unit (pure helper): the full matrix above.

Mobile: the dismissal key behaves correctly — declining then re-foregrounding with the same remote
state produces no prompt, and a changed remote timestamp produces one.

E2E is covered by prompt 09; do not add Maestro flows here.

## Acceptance

- The same-item case has **no** prompt, no threshold, and no dedicated code path.
- The comparison exists once, in `@podverse/helpers`, and both clients call it.
- No prompt can appear while audio plays locally, enforced by a guard rather than assumed.
- The prompt names both episodes.
- Switch plays; Continue promotes local and demotes the server's item to history.
- A dismissal is keyed to the declined state and stored device-locally.
- Neither choice emits a removal tombstone.
- All copy resolves through i18n, with keys shared between web and mobile.
