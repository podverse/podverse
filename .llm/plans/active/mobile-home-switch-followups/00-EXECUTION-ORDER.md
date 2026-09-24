# Execution order — parked Home switch follow-ups

Parked on 2026-09-23. Do not start this set unless a new manual iOS capture shows the chip switch
has regressed, or play / refresh itself feels heavy. The felt chip-switch goal was met by the
thumbnail work in
[completed/mobile-chip-switch-smooth](../../completed/mobile-chip-switch-smooth/00-CLOSED.md).
Narrative and numbers: [MOBILE-IOS-CHIP-SWITCH.md](/docs/development/mobile/MOBILE-IOS-CHIP-SWITCH.md)
and the T5 row in [MOBILE-PERF-BASELINES.md](/docs/development/mobile/MOBILE-PERF-BASELINES.md).

T5 (dev JS, real library, `"iPhone 17 Pro"`): chip visible p95 83.6 ms first / 66.7 ms revisit,
UI-thread gap p95 59.2 ms, 0 of 13 taps with a gap ≥ 100 ms, footprint 265 MB. The same-frame
targets below were not met. Closing that gap is 08–09b, which keep extra lists mounted.

08–09b apply exact edits written against `HomeScreen.tsx` from before thumbnail `decodeEdge`
wiring. If an anchor does not match, stop. Do not hand-edit around a failed helper.

## What each remaining prompt is for

| # | File | What it changes | Chip numbers |
| --- | --- | --- | --- |
| 04 | [04-profile-capture.md](./04-profile-capture.md) | Optional profile. Skip. | — |
| 06a | [06a-playback-row-store.md](./06a-playback-row-store.md) | Store only; nothing reads it yet | no |
| 06b | [06b-playback-row-consumers.md](./06b-playback-row-consumers.md) | Play/pause re-renders the rows it affects | no |
| 07 | [07-row-identity-reuse.md](./07-row-identity-reuse.md) | Reload keeps unchanged row objects | no |
| 08 | [08-home-list-extraction.md](./08-home-list-extraction.md) | Move the list out of `HomeScreen`. Same behavior | no |
| 09a | [09a-home-list-hidden-mode.md](./09a-home-list-hidden-mode.md) | Hidden-list groundwork | no |
| 09b | [09b-home-kept-lists.md](./09b-home-kept-lists.md) | A tap reveals a kept list; nothing unmounts | yes |
| 10 | [10-home-close-out.md](./10-home-close-out.md) | Prod-JS captures and the write-up | — |

06–07 do not exist to make chips faster. 08 exists so 09 can mount more than one list. If 08 is
reverted, stop: 09 depends on it.

## Targets (only if 09b is kept, dev JS on `"iPhone 17 Pro"`)

| Metric | Target |
| --- | --- |
| `chipVisibleMs` p95, first visit | ≤ 50 ms |
| `chipVisibleMs` p95, revisit | ≤ 34 ms |
| `listVisibleMs` − `chipVisibleMs` on a revisit | ≤ 17 ms |
| `spinnerVisibleMs` − `chipVisibleMs` on a first visit | ≤ 17 ms |
| Revisit taps with a UI-thread gap ≥ 100 ms | 0 |
| `uiMaxGapMs` p95 | ≤ 50 ms |

## Rules for the executing agent

1. Read the whole milestone file first, then read every file it names before editing any of them.
2. Find code by the **quoted anchor text**. Line numbers are hints only.
3. Make only the edits the milestone lists. No renames, refactors, or drive-by fixes.
4. If an anchor is missing, a helper command fails, or the code around an anchor differs from what
   the step shows, **stop and report**. Do not invent a design and do not hand-edit around a failed
   helper.
5. No `any`; no `as` except `as const`; `===` / `!==` only; `import type` on its own line; named
   exports; comments describe the code as it stands; user-facing copy is sentence case.
6. **Never** run tests, lint, type-check, builds, Maestro, or the perf harness. **Never** run git
   commands that write. Undo by editing, never with git.
7. Commands you may run, from the monorepo root: `rg`, `ls`, `cp`, `mv`, `mkdir`, the helper
   `./scripts/nix/with-env node .llm/plans/active/mobile-home-switch-followups/tools/move-blocks.mjs`
   with `move`, `apply-edits`, or `unused-imports` exactly as a milestone shows, and Prettier on
   files you changed via `./scripts/nix/with-env`.
8. Milestones 08–09b copy backups to
   `.llm/plans/active/mobile-home-switch-followups/backup/<File>.pre<NN>.tsx.txt`.
9. When a milestone is done: tick it in COPY-PASTA.md, move that file to
   `.llm/plans/completed/mobile-home-switch-followups/`, and end with its Operator checkpoint.
10. A checkpoint review never edits product code except a revert the milestone calls for, and only
    after the operator agrees.

## Stop rules

- A fix that misses its keep rule is reverted before the next milestone, and the ledger says so.
- If impression and numbers disagree, record both and ask. Do not decide alone.
- If 08 is reverted, stop the set.
- Do not re-run experiments recorded as reverted in `MOBILE-PERF-BASELINES.md`.

Browse stays unplanned until this set is either finished or dropped for good.
