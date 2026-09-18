# 05 — E2E, abcmemory, and closeout

**Cursor model:** Codex 5.3
**Reasoning:** medium

Detail doc:
[779-automatic-offline-detection](/docs/proposals/mobile/_master-plan_/phase-2/details/779-automatic-offline-detection.md)
· Decisions: [00-SUMMARY.md](00-SUMMARY.md) · Depends on: 01–04

Last prompt in the set. End the response with **all** cumulative verification commands for the whole
set, assuming the operator ran every earlier prompt without testing.

## Scope

Device coverage for what can honestly be covered, then the durable guidance — the rules that
currently forbid this feature must be rewritten, or the next agent reverts it.

## E2E — `apps/mobile/e2e/offline-mode.yaml`

Extend the existing flow. Assert the manual-toggle banner still appears with its current copy and
`testID`, and add coverage for the auto banner where the harness can produce it.

Be honest about the limits rather than writing a flow that passes without proving anything:

- **Server unreachable** is reachable in the harness — the operator can stop the **Mobile E2E API**
  process and the app should show "can't reach the server". If that cannot be sequenced inside a
  single Maestro run, leave it as a documented manual check in the flow's comments rather than a
  fake assertion.
- **Device offline** needs airplane mode on the simulator, which Maestro cannot toggle reliably
  across both platforms. Do not write an assertion that pretends to cover it.
- **Debounce timing** is a unit-test concern and is already covered by
  `connectivityMachine.test.ts`. Do not try to assert a debounce window through the UI.

Where you skip a case, add a short comment saying what is not covered and why — without citing this
plan or a step number ([`comments-future-forward`](/.cursor/rules/comments-future-forward.mdc)).

Follow [`mobile-maestro-timeouts`](/.cursor/rules/mobile-maestro-timeouts.mdc) for waits and
`mobile-e2e-screenshots` for report slots.

## abcmemory

### `.cursor/rules/mobile-offline-mode.mdc`

This rule currently forbids the feature:

```21:21:.cursor/rules/mobile-offline-mode.mdc
- Activation is **toggle-only**. Do **not** auto-enter or auto-leave from NetInfo / airplane mode.
```

Rewrite the rule around the three concepts. It must make the following enforceable, because each is
something a future agent would otherwise get wrong:

- The pref is still never written by reachability, and it is still never account-synced.
- Auto-offline is **softer** than the toggle: it permits user-initiated requests, health probes, and
  remote streaming. The toggle refuses all of it.
- Auto-offline **never** steers navigation; the toggle does.
- Exit requires a successful request. NetInfo is a hint, never the authority.
- The announcement is the bottom-chrome strip only — never a toast, dialog, or push.
- The More switch shows the pref only.

Keep the existing § While on, § Screen behavior, and § Playback is recorded while parked content for
the forced case; add the auto column rather than replacing them.

### `.cursor/rules/mobile-sync-orchestration.mdc`

The § Related section repeats the same superseded instruction:

```96:97:.cursor/rules/mobile-sync-orchestration.mdc
- Rule: **mobile-offline-mode** — user-forced Offline Mode parks this queue the same way as a real
  outage; do not auto-toggle from NetInfo
```

Fix that line. Also add a sentence to the body noting that the queue now parks on a server-unreachable
classification too, and that resume comes from the connectivity probe rather than a raw NetInfo event.

Only `.cursor/**` paths are abcmemory
([`llm-cursor-source`](/.cursor/rules/llm-cursor-source.mdc)). Do not put this guidance in `.llm/`.

## Docs

- `docs/proposals/mobile/_master-plan_/phase-2/details/742-offline-mode.md` — add a short note under
  its locked decisions that activation is superseded by 779, with a link. Do not rewrite the rest;
  742 is a completed record of the toggle.
- `docs/.../details/779-automatic-offline-detection.md` — flip **Status** to `done`.
- `docs/proposals/mobile/_master-plan_/phase-2/001-MASTER-PLAN-PHASE-2.md` — index 779 under
  **P2.1.10** in the step table (near the existing 742 row, around line 170) and in the Appendix
  table (around line 533), matching the surrounding row format and column alignment.

## Closeout

- Mark prompt 05 complete in [COPY-PASTA.md](COPY-PASTA.md).
- Move the whole set to `.llm/plans/completed/07-mobile-auto-offline-detection/`
  ([`plan-lifecycle`](/.cursor/rules/plan-lifecycle.mdc)).
- Update `.llm/plans/active/LLM-PLANS-ACTIVE.md` to drop the set from the active index and note the
  completed archive path.
- Update `.llm/plans/active/COPY-PASTA-RUN-ORDER.md` to remove the set from the run-order table.

## Do not

- Do not write a Maestro assertion for a case the harness cannot actually produce.
- Do not run tests. End with operator commands.
- Do not cite plan paths, detail numbers, or step numbers in code or flow comments.

## Cumulative verification for the whole set

Give the operator this at the end of the response. **Mobile Metro**, **Mobile iOS** / **Mobile
Android**, and **Mobile E2E API** must already be up — name those in prose, not in the paste block
([`vscode-terminals-commands`](/.cursor/rules/vscode-terminals-commands.mdc)).

```bash
npm run build:packages
npm run lint
npm --prefix apps/mobile run test
npm run mobile:e2e:test -- offline-mode
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
