# COPY-PASTA — parked Home switch follow-ups

Do not paste these until the operator decides the follow-up is worth doing. Why it is parked, and
the T5 numbers, are in [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md).

01a–03c and 05a–05b are done:
[completed/mobile-chip-switch-smooth](../../completed/mobile-chip-switch-smooth/00-CLOSED.md).
04 was skipped.

Every prompt below uses:

**Cursor model:** Cursor Grok 4.7 Extra High Fast
**Reasoning:** extra high

Tick the box on the prompt itself when that prompt is done.

- [ ] **04 — Profile capture (optional, PROF1)**

Skip this prompt and go to 06a if you do not want a profile.

```
Read and execute .llm/plans/active/mobile-home-switch-followups/04-profile-capture.md

Follow the "Rules for the executing agent" in 00-EXECUTION-ORDER.md.
Use only the commands those rules allow. If a helper command fails, stop and report its output.
Do not run tests during agent work; end with the milestone's Operator checkpoint section.
```

- [ ] **06a — Playback row store**

```
Read and execute .llm/plans/active/mobile-home-switch-followups/06a-playback-row-store.md

Follow the "Rules for the executing agent" in 00-EXECUTION-ORDER.md.
Use only the commands those rules allow. If a helper command fails, stop and report its output.
Do not run tests during agent work; end with the milestone's Operator checkpoint section.
```

- [ ] **06b — Playback row consumers** (captures P6, C6)

```
Read and execute .llm/plans/active/mobile-home-switch-followups/06b-playback-row-consumers.md

Follow the "Rules for the executing agent" in 00-EXECUTION-ORDER.md.
Use only the commands those rules allow. If a helper command fails, stop and report its output.
Do not run tests during agent work; end with the milestone's Operator checkpoint section.
```

- [ ] **07 — Row identity reuse** (capture R7)

**Operator first:** P6 and C6 reviewed.

```
Read and execute .llm/plans/active/mobile-home-switch-followups/07-row-identity-reuse.md

Follow the "Rules for the executing agent" in 00-EXECUTION-ORDER.md.
Use only the commands those rules allow. If a helper command fails, stop and report its output.
Do not run tests during agent work; end with the milestone's Operator checkpoint section.
```

- [ ] **08 — Home list extraction** (capture C8 + Maestro)

**Operator first:** R7 reviewed.

```
Read and execute .llm/plans/active/mobile-home-switch-followups/08-home-list-extraction.md

Follow the "Rules for the executing agent" in 00-EXECUTION-ORDER.md.
Use the move-blocks helper exactly as the milestone describes; do not retype moved code.
Use only the commands those rules allow. If a helper command fails, stop and report its output.
Do not run tests during agent work; end with the milestone's Operator checkpoint section.
```

- [ ] **09a — Home list hidden mode**

**Operator first:** C8 reviewed as no change, and the Maestro `home` flows passed.

```
Read and execute .llm/plans/active/mobile-home-switch-followups/09a-home-list-hidden-mode.md

Follow the "Rules for the executing agent" in 00-EXECUTION-ORDER.md.
Use the move-blocks helper exactly as the milestone describes; do not retype moved code.
Use only the commands those rules allow. If a helper command fails, stop and report its output.
Do not run tests during agent work; end with the milestone's Operator checkpoint section.
```

- [ ] **09b — Home kept lists** (captures C9a, C9b + Maestro)

**Operator first:** reply `done 09a` after the unit test and type-check pass.

```
Read and execute .llm/plans/active/mobile-home-switch-followups/09b-home-kept-lists.md

Follow the "Rules for the executing agent" in 00-EXECUTION-ORDER.md.
Use the move-blocks helper exactly as the milestone describes; do not retype moved code.
Use only the commands those rules allow. If a helper command fails, stop and report its output.
Do not run tests during agent work; end with the milestone's Operator checkpoint section.
```

- [ ] **10 — Home close-out** (captures FIN, FINP; last prompt)

**Operator first:** with **Mobile Metro** running `npm run mobile:dev:perf:prodjs` (stop the dev
Metro first), capture **FIN** (`chips`) and then **FINP** (`play`) with the normal capture steps in
[CHECKPOINT.md](./CHECKPOINT.md), then paste:

```
Read and execute .llm/plans/active/mobile-home-switch-followups/10-home-close-out.md

Captures FIN and FINP are collected. Operator impression: <one line>.
Follow the "Rules for the executing agent" in 00-EXECUTION-ORDER.md.
This is the last prompt in the set: end with all cumulative verification commands for the set.
Do not run tests during agent work.
```

## Checkpoint review (paste after any capture)

```
Read .llm/plans/active/mobile-home-switch-followups/CHECKPOINT.md and review capture <LABEL> for milestone <NN>.
Operator impression: <one line>. Maestro result (if run): <pass/fail and flow names>.

Follow the review procedure: add the ledger row(s) to docs/development/mobile/MOBILE-PERF-BASELINES.md, apply the milestone's keep and revert rules, and wait for my go-ahead before making any revert.
Do not run tests during agent work.
```
