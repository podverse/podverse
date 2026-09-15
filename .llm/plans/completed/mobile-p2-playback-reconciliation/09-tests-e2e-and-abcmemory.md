# 09 — Tests, E2E, abcmemory, and status

**Details:** [743](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md),
[744](/docs/proposals/mobile/_master-plan_/phase-2/details/744-multi-device-playback-handoff.md)
**Model:** Codex 5.3 · **Reasoning:** medium
**Workspaces:** `apps/mobile`, `apps/api`, `.cursor`, `docs`

Final prompt. Closes coverage, writes the durable guidance, and flips status.

## Mobile E2E

Mobile uses Maestro, never `make e2e_*`
([`mobile-e2e-screenshots`](/.cursor/skills/mobile-e2e-screenshots/SKILL.md)). Feature changes
require a flow ([`mobile-feature-requires-e2e`](/.cursor/rules/mobile-feature-requires-e2e.mdc)).

Add `apps/mobile/e2e/playback-offline-reconciliation.yaml`:

1. Sign in, play an episode, let it advance.
2. Turn on Offline Mode from More → Features.
3. Play a second episode offline; advance it; complete it.
4. Turn Offline Mode off.
5. Wait for the sync indicator to settle.
6. Assert both episodes appear in Library → History, **newest first**, and the offline one has its
   position preserved.

Respect the timeout guidance in
[`mobile-maestro-timeouts`](/.cursor/skills/mobile-maestro-timeouts/SKILL.md) — a sync-settle wait
is exactly the kind of step that flakes when given an arbitrary sleep.

The API-backed profile is needed, so this flow requires **Mobile E2E API** to be running.

### Handoff prompt flow

Add `apps/mobile/e2e/playback-multi-device-handoff.yaml` for prompt 08's surface. Maestro drives
one device, so seed the "other device" state through the API rather than trying to run two:

1. Sign in on the device and load episode A without playing.
2. Seed a newer now-playing row for episode **B** on the same account via the E2E API.
3. Foreground the app and assert the prompt appears, naming both episodes.
4. Tap **Continue** and assert A stays loaded and B lands in history.
5. Re-foreground and assert the prompt does **not** reappear for the same remote state.

Also assert the negative case: seed a newer position on episode **A** itself and confirm the app
adopts the position with **no prompt**.

### What stays unproven, on purpose

Maestro cannot drive two real devices or skew a device clock, so the two-device interleave and the
clock-offset correction are covered only by unit tests (prompts 01, 07) and API integration tests
(prompt 03). Do not build simulator scaffolding to chase it here. Note the gap in the response so
it is a known limitation rather than an assumed pass.

## API integration coverage

Confirm prompt 03's tests landed and add the cross-cutting cases if missing:

1. History returns newest-listened first after mixed-timestamp writes.
2. A replayed batch produces the same state as applying the events one at a time.
3. An out-of-order batch is applied in timestamp order.

## abcmemory

Committed agent guidance lives only under `.cursor/`
([`llm-cursor-source`](/.cursor/rules/llm-cursor-source.mdc)).

### New rule — `.cursor/rules/playback-meaningful-events.mdc`

Cross-surface, so scope the globs to mobile, web, api, orm, and helpers — not mobile alone.

Content:

- The one-sentence rule: **the audio advanced, or the user acted on it.**
- The meaningful and non-meaningful tables from
  [743](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md).
- Why the exclusions are load-bearing: app open must not bump the clock, or a stale offline device
  beats a newer remote listen.
- Why the inclusions are load-bearing: without timer-tick-while-playing, a long active session
  carries a stale timestamp and loses to any device that touched anything mid-session.
- That the check is `isMeaningfulPlaybackEvent` in `@podverse/helpers` and must never be
  reimplemented locally.
- That a zone move is not a removal, with the four-row table from prompt 05.
- That a **same-item** now-playing disagreement adopts the newer position silently and must never
  grow a prompt, a threshold, or a position-delta comparison. Only a **different item** asks the
  user. This is the decision most likely to be "improved" back into a nag.
- That reconciliation never loads a different item while playback is active.

Write it future-forward — state the rule as it stands, not how it was decided, and cite no plan or
detail numbers ([`comments-future-forward`](/.cursor/rules/comments-future-forward.mdc)).

### Update `.cursor/rules/mobile-offline-mode.mdc`

The section **"Playback is not recorded while parked"** documents the gap this work closes. It
currently says there is no playback outbox and no replay job. Rewrite it to describe the behavior
that now exists: listening in Offline Mode is recorded locally with the time it happened and
replays on reconnect, bounded at 500 events, with positions collapsing and completions preserved.

Do not leave a note about what it used to say.

### Update `.cursor/skills/mobile-data-layer/SKILL.md`

It describes the repositories and the local-first seam. Add the playback outbox and
`playback_local_state` so the next agent does not conclude, as this planning round initially did,
that no outbox exists.

### Check `.cursor/rules/mobile-sync-orchestration.mdc`

The `playback-replay` job runs before `queue-hydrate`. If that rule enumerates job ordering, add it.

## Documentation

- `apps/mobile/src/data/README.md` — the two new tables and migration 16.
- [LINEAR-MIGRATIONS.md](/docs/operations/database/LINEAR-MIGRATIONS.md) — only if `0010` needs a
  note beyond the file itself.

## Status flips

Per [`mobile-master-plan-phasing`](/.cursor/skills/mobile-master-plan-phasing/SKILL.md):

1. In [Phase 2 master plan](/docs/proposals/mobile/_master-plan_/phase-2/001-MASTER-PLAN-PHASE-2.md)
   Track P2.4, set **both P2.4.11 and P2.4.12** to `done`.
2. Same for both in the Appendix detail index.
3. Set the headers of **743 and 744** to `**Status:** done`.
4. Update the Track P2.4 prose, which currently says both steps are open and that playback is
   pull-only with dropped offline writes. None of that is true afterwards.
6. Mark every prompt `[x]` in [COPY-PASTA.md](COPY-PASTA.md).
7. **Move** the set to `.llm/plans/completed/mobile-p2-playback-reconciliation/`, preserving
   structure ([`plan-lifecycle`](/.cursor/rules/plan-lifecycle.mdc)). Do not delete it: the Phase 2
   master plan links locked-decision lists at `.llm/plans/completed/mobile-p2-*/00-SUMMARY.md` for
   every closed area, and deleting this one would break that pattern and lose the decisions.
8. Update the master plan's Track P2.4 reference from the `active/` path to the `completed/` one.

## Acceptance

- A Maestro flow proves offline listening survives a round trip through Offline Mode.
- A Maestro flow proves the handoff prompt appears for a different item and **not** for the same
  item, and that a dismissal is remembered.
- The meaningful-event rule exists as abcmemory, scoped cross-surface.
- No abcmemory file still describes the offline playback gap as open.
- Both P2.4.11 and P2.4.12 are `done`.
- The plan set is **moved** to `completed/`, not deleted.
- The response names what stays unproven (two-device interleave, clock skew).

## Cumulative verification (operator)

This is the last prompt, so the response ends with the whole set's commands
([`response-ending-make-verify`](/.cursor/skills/response-ending-make-verify/SKILL.md)). Order:
build and lint, unit, API, then E2E. **Mobile Metro** and **Mobile E2E API** must already be up in
their own tabs; do not paste leave-running commands into the one-shot block.
