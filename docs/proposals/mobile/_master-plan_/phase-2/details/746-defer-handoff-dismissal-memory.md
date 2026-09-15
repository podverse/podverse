# 746-defer-handoff-dismissal-memory

**Master step:** P2.3.18
**Model (author + implement):** Opus 5
**Status:** deferred

## Scope

Declining a multi-device handoff prompt is remembered in a single device-local slot keyed
`<itemIdText>::<lastPlayedAtMs>` — `playback.handoff_dismissed_state` in mobile prefs, and
`PLAYBACK_HANDOFF_DISMISSED_STATE_KEY` in web `localStorage`. Two consequences follow from that
shape.

### One slot across queues

Mobile evaluates conflicts across every queue, preferring the active one, but only one dismissal is
stored. With both an AV and a music queue in conflict, answering one forgets the other, so the first
prompt can return after the second is answered.

### The key moves when the other device keeps playing

Because the remote timestamp is part of the key, a second device that is still listening mints a new
key on every foreground. "Keep playing here" therefore does not stick: pause on the phone, listen on
the desktop, decline the prompt, put the phone down, and pick it up again a few minutes later while
the desktop is still going — the phone asks again.

This is defensible (the remote state genuinely changed) but reads as nagging, because from the
user's side it is the same question about the same episode on the same pair of devices.

## Why deferred

The prompt is correct in the case it was built for — a different item, local playback idle, newest
timestamp wins — and both failure modes are annoyance rather than data loss or a wrong merge. The fix
is a storage-shape decision that benefits from real usage: whether repeat prompts actually bother
people, and how often two queues conflict at once, are answerable once the feature has been in
someone's hands.

## Options to weigh when picked up

- **Key on item only.** Simplest, and matches "I already said no to this episode." Loses the ability
  to re-ask when the other device moves much further along.
- **Keep a small per-queue map.** Fixes the cross-queue case directly; needs a bound and an eviction
  rule so the stored value cannot grow without limit.
- **Add a cooldown.** Remember the decline for a window rather than for an exact remote state.
  Keeps re-asking possible without asking every foreground.

These are not exclusive; a per-queue map keyed on item is the likely shape.

## Acceptance criteria (when picked up)

- Declining a handoff for one queue does not clear the decision recorded for another queue.
- A second device that continues listening to the same episode does not cause a repeat prompt on
  every foreground.
- Whatever is stored stays bounded, on both mobile prefs and web `localStorage`.
- The comparison that decides whether to prompt at all stays in `resolveHandoffDecision` in
  `@podverse/helpers`, with both clients calling it — dismissal memory is the only surface-local part.
- Same-item disagreements still adopt the newer position silently, with no prompt, threshold, or
  position-delta rule, per
  [`playback-meaningful-events`](/.cursor/rules/playback-meaningful-events.mdc).

## Not in scope

The playback position network write interval (`PLAYBACK_POSITION_NETWORK_INTERVAL_MS`, currently
15 s) is deliberately left as it is. At four writes per minute per actively playing client it is the
obvious knob if queue-write volume becomes a problem, and it is a single shared constant in
`@podverse/helpers`, so changing it later is one edit. It is recorded here only so the number is not
rediscovered from scratch.

## Web parity references

- `packages/helpers/src/lib/playbackTimestamps.ts` (`resolveHandoffDecision`)
- `apps/mobile/src/playback/playbackHandoff.ts`
- `apps/mobile/src/prefs/prefsStore.ts`
- `apps/web/src/utils/playbackHandoffDismissal.ts`
- `apps/web/src/hooks/useMediaPlayerControllerQueueHeadLoading.ts`
- [744-multi-device-playback-handoff](/docs/proposals/mobile/_master-plan_/phase-2/details/744-multi-device-playback-handoff.md)

## Verification

```bash
# Mobile Maestro — when implemented
npm run mobile:e2e:test -- playback-multi-device-handoff
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
