---
name: mobile-master-plan-phasing
description: Phase structure and just-in-time workflow for the Podverse mobile master plan (Phase 1 closed, Phase 2 active). Use when the operator asks what to work on next in the mobile master plan, to plan or detail the next mobile phase, to create deferred detail docs and COPY-PASTA sets, or to implement a mobile master-plan phase.
---

# Mobile master plan — just-in-time phasing

This skill governs **how** to advance the mobile master plan in small phases. It does **not** replace
the master plan; it orchestrates detailing and implementation one parallel group at a time.

## Phase model (read first)

The master plan is split into phases under
[`docs/proposals/mobile/_master-plan_/`](/docs/proposals/mobile/_master-plan_/PHASES.md), each with
its own plan document and `details/` directory:

| Phase | Plan                                                                                                          | Theme                                  | State                                       |
| ----- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------- |
| 1     | [phase-1/001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md)                 | Framework build-out, Tracks 0–23       | **closed** — history only, do not add steps |
| 2     | [phase-2/001-MASTER-PLAN-PHASE-2.md](/docs/proposals/mobile/_master-plan_/phase-2/001-MASTER-PLAN-PHASE-2.md) | Legacy-parity features + visual polish | **active**                                  |
| 3     | [phase-3/001-MASTER-PLAN-PHASE-3.md](/docs/proposals/mobile/_master-plan_/phase-3/001-MASTER-PLAN-PHASE-3.md) | V4V                                    | not started                                 |
| 4     | [phase-4/001-MASTER-PLAN-PHASE-4.md](/docs/proposals/mobile/_master-plan_/phase-4/001-MASTER-PLAN-PHASE-4.md) | Watch + TV                             | not started                                 |
| 5     | [phase-5/001-MASTER-PLAN-PHASE-5.md](/docs/proposals/mobile/_master-plan_/phase-5/001-MASTER-PLAN-PHASE-5.md) | Native store IAP                       | not started                                 |

**Phase 1 was agent-led; Phase 2 onward is operator-guided.** In Phase 2 the operator drives with
**legacy app screenshots** and the agent asks questions before proposing anything — see
[`mobile-legacy-screenshot-planning`](/.cursor/skills/mobile-legacy-screenshot-planning/SKILL.md).
Sections below describing the Phase 1 status lifecycle and ship bar are **Phase 1 history**; use the
screenshot skill for Phase 2 work.

Phase 1 execution plan sets were removed after their outcomes were captured in the phase plans.
Phase 2 sets go to `.llm/plans/active/mobile-p2-<area>/` and are removed when the area closes.

## Operator loop (Phase 1 pattern — see the screenshot skill for Phase 2)

```text
1. Ask: "What should we work on next in the mobile master plan?"
2. Agent recommends the next phase (this skill § Selecting the next phase).
3. Operator confirms or adjusts scope.
4. Ask: "Create detailed plan files for that phase" (defer only — no implementation).
5. Agent writes detail docs + `.llm/plans/active/mobile-<phase-slug>/` COPY-PASTA set.
6. Ask: paste COPY-PASTA prompts to implement.
7. Agent implements; **marks completed steps `done` as each COPY-PASTA prompt finishes**; archives plan set when phase is finished.
```

Repeat from step 1.

## When to use

- Operator asks what's next for mobile / master plan / PG-* / Track N.
- Operator wants detail plans for a phase before deferring implementation.
- Operator pastes COPY-PASTA from `.llm/plans/active/mobile-*/COPY-PASTA.md`.
- Agent is about to mass-write many `details/NNN-*.md` files — **stop** and read § Guardrails.

## Authoritative sources

| Source                  | Path                                                              | Use for                            |
| ----------------------- | ----------------------------------------------------------------- | ---------------------------------- |
| Master plan             | `docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md`  | Steps, Model, PG table, Appendix C |
| Detail docs (durable)   | `docs/proposals/mobile/_master-plan_/phase-1/details/NNN-slug.md` | Per-step design + acceptance       |
| Phase plans (transient) | `.llm/plans/active/mobile-<phase-slug>/`                          | COPY-PASTA execution               |
| Proposal docs           | `docs/proposals/mobile/**`                                        | Parity and architecture context    |

Related skills: **parallel-plan-execution**, **plan-completion**, **response-ending-make-verify**.

---

## Status lifecycle

Each master-plan step line ends with a status suffix on the detail link:

| Status    | Meaning                                              | Visible as        |
| --------- | ---------------------------------------------------- | ----------------- |
| `_TBD_`   | Not yet detailed                                     | Not started       |
| `planned` | Detail doc + phase COPY-PASTA exist; not implemented | Planned, deferred |
| `done`    | Implemented (operator may verify separately)         | **Completed**     |

Step line format: `… Detail: [slug](path) — done` (suffix after em dash).

Mirror the same value in **Appendix C** `Status` column **and** update the suffix on the matching
step line in **Tracks** whenever status changes. Never leave implemented work at `_TBD_`.

Detail doc header uses its own field: `**Status:** draft | ready | done` (file-level).

### Track section headers — `(DONE)` marker

Each `## Track N — …` heading in
[001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md) must show whether the
**entire track** is complete when scrolling the outline / document:

| Header form                      | When                                             |
| -------------------------------- | ------------------------------------------------ |
| `## Track N — Title (DONE)`      | **Every** step in that track section is `— done` |
| `## Track N — Title` (no suffix) | Any step still `_TBD_` or `planned`              |

Rules:

- Append exactly ` (DONE)` (space + parentheses + DONE) at the **end** of the heading text.
- Do **not** use partial markers (`(PARTIAL)`, `(IN PROGRESS)`) on track headers — only full-track
  `(DONE)` or nothing.
- When the **last** remaining non-`done` step in a track flips to `done`, add `(DONE)` to that
  track’s `##` heading in the same edit.
- If a track is reopened (a step moves off `done`), **remove** `(DONE)` from the heading.
- Track 2 spike-complete-but-video-remaining stays **without** `(DONE)` until 2.14+ (and any other
  open steps) are `done`.

---

## Progress tracking (mandatory)

Status is **living state**, not write-once. Agents maintain it **as work completes**.

### When to update

| Event                                                    | Action                                                                        |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Phase detail files created                               | `_TBD_` → `planned` for that phase's steps (Tracks + Appendix C)              |
| Each COPY-PASTA prompt implemented                       | Affected steps → `done` immediately (Tracks + Appendix C + detail doc header) |
| Last step in a track becomes `done`                      | Append ` (DONE)` to that track’s `## Track …` heading                         |
| Operator says work was done outside a session            | Reconcile: flip matching steps to `done` before recommending next             |
| "What should we work on next in the mobile master plan?" | **Read** status first; **report** progress; then recommend                    |

### Incremental completion (COPY-PASTA)

Do **not** wait until the last prompt in a phase to mark steps `done`.

After **each** COPY-PASTA prompt in `mobile-<phase-slug>/COPY-PASTA.md`:

1. Mark the prompt `[x]` complete in `COPY-PASTA.md`.
2. Flip every master-plan step implemented by that prompt: `planned` or `_TBD_` → `done`.
3. Update **Appendix C** `Status` for those detail IDs.
4. Set matching `details/NNN-slug.md` headers to `**Status:** done` when detail files exist.
5. If that track now has **all** steps `done`, append ` (DONE)` to its `## Track …` heading
   (see § Track section headers).

On the **last** prompt: remove `.llm/plans/active/mobile-<phase-slug>/` after the operator confirms
the phase is complete. Preserve durable outcomes in the phase plan and detail docs.

### "What next" response — required progress block

When the operator asks what to work on next in the **mobile master plan**, **always** include this
before the recommendation (use `grep` against the active phase plan; do not guess):

```markdown
## Mobile master plan — progress (Phase 2)

| Area / track | Status |
| ------------ | ------ |
| P2.1.N …     | not started / questions asked / planned / done |

**Recently completed:** area or step names (or "none yet")

**Active phase plan:** `.llm/plans/active/mobile-p2-<area>/` (or "none")

**Open items needing an operator decision:** list from Phase 2 § Track P2.3

**Next recommended:** area — and what screenshots would unblock it
```

Always surface the **open items needing an operator decision** from
[Phase 2 § Track P2.3](/docs/proposals/mobile/_master-plan_/phase-2/001-MASTER-PLAN-PHASE-2.md) —
they are easy to lose because they need manual device work or a product call, not code.

Phase 1 counts (`done` / `planned` / `_TBD_`) are **frozen history**; do not re-report them as
outstanding work. If repo evidence contradicts a recorded status, **reconcile** with the operator:
list mismatched steps and offer to correct them.

### Prerequisite checks use `done`

When selecting the next PG, treat a prerequisite as satisfied only when its steps are **`done`**
(not `planned`). Exception: operator explicitly asks to detail ahead of implementation.

---

## Selecting the next phase ("What should we work on next in the mobile master plan?")

### 1. Read current state

1. Open `001-MASTER-PLAN.md` — **Parallel groups** table and **Appendix C**.
2. Count steps by suffix: `done`, `planned`, `_TBD_` (Tracks section and/or Appendix C).
3. Check `.llm/plans/active/mobile-*/` for an in-progress phase plan set.
4. For each PG row, determine whether prerequisites are satisfied (all prerequisite steps
   **`done`** — not `planned` unless operator explicitly wants detailing ahead).
5. Find the **lowest-numbered PG** whose tracks still have `_TBD_` or `planned` steps and whose
   prerequisites are met.
6. Emit the **Progress block** (§ Progress tracking) before recommending.

### 2. Parallel group order (reference)

| Group  | Tracks                                     | Prerequisites (summary)                                                     |
| ------ | ------------------------------------------ | --------------------------------------------------------------------------- |
| PG-0   | 0                                          | none                                                                        |
| PG-1   | 1                                          | 0 partial (0.6+ abcmemory)                                                  |
| PG-2a  | 3                                          | 0                                                                           |
| PG-2b  | 2 spike (2.1–2.13, 2.34, 2.35 contract)    | 0, 1 recommended                                                            |
| PG-3   | 4, 5                                       | 3 hello-world; **5.17–5.20** before auth Maestro                            |
| PG-4   | 6, 7 (+ 0.20, 7.11–7.16 themes)            | 3, 5 (incl. **5.17–5.20** `done` before 6.11/6.12); 0.20 before theme steps |
| PG-5   | 2 full (2.14–2.35)                         | 2 spike, 1; prefer after PG-7 audio player shell                            |
| PG-6   | 8, 9                                       | 6, 7; **7.11–7.15** theme scaffold `done`                                   |
| PG-6.5 | 9b (data layer + RSS mapping + primitives) | PG-6; **before** Track 10 (9b.1–9b.4 required)                              |
| PG-6.6 | 9c (media row action chrome)               | PG-6; prefer after 9b.6; may parallel PG-7; handlers → Track 10 when ready  |
| PG-6.7 | 9d (playlist create/edit/reorder sketches) | PG-6.6; Track 9.10–9.11; may parallel Track 11 video                        |
| PG-7   | 10, 11 (audio-first)                       | 1, 2 spike, 6, **9b.1–9b.4**; primitives 9b.6–9b.7 and 9c may parallel      |
| PG-8   | 12                                         | 2, 10                                                                       |
| PG-9   | 13–17                                      | 6, 10 (varies); **9b** for downloads metadata rows                          |
| PG-10  | 18                                         | 7, 11                                                                       |
| PG-11  | 19–21                                      | MVP feature-complete                                                        |
| PG-12  | 22                                         | 4, PG-11                                                                    |
| PG-13  | 23 (operator visual polish)                | Feature bulk + **operator** screen briefs — not before                      |

PG-2a and PG-2b can overlap in time with PG-3 after PG-0; recommend **one primary PG per
detailing batch** unless operator asks for parallel detailing of independent groups.

### 3. Risk-first overrides (mandatory)

Apply these **before** recommending PG-7+ detailing or implementation:

1. **Track 1** (`playback-core` extraction) should be `done` before Track 2 full engine and before
   Track 10/11 implementation.
2. **Track 2 spike** (steps 2.1–2.13, 2.34, **2.35 cache-hook contract/stubs**) must be `done`
   before Tracks 10/11/12. Spike must satisfy **car foundation** constraints (single player,
   `MediaLibraryService`, shared remotes, reserved cache writes) even though seamless CarPlay/AA
   QA is Track 12 (12.5–12.6, 12.17–12.18). Video E2E step 2.33 may follow the audio spike.
3. **Track 9b** (offline-first data layer, steps 9b.1–9b.4) must be `done` or in progress before
   Track 10 queue store — screens must read repositories, not `req*` directly. See
   [DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md).
4. If step 2.34 fails, stop downstream player/car detailing; revise master plan steps with operator
   before proceeding.

If the naive "lowest PG with `_TBD_`" violates these, recommend the blocked prerequisite phase
instead and explain why.

### 4. Open decisions gate

Before detailing tracks that depend on unresolved choices, prompt operator to decide (or accept
default from master plan **Open decisions**):

| Decision                         | Blocks detailing for                                               |
| -------------------------------- | ------------------------------------------------------------------ |
| E2E framework (Maestro vs Detox) | Track 5, all E2E-heavy steps                                       |
| CI tooling (EAS vs Fastlane)     | Track 4, Track 22                                                  |
| Offline data (decided)           | Track 9b — offline-first SQLite + repositories                     |
| Visual polish (decided)          | Track 9b.6–9b.7 primitives now; **Track 23** operator polish later |

### Ship bar (always apply)

Before recommending or detailing a phase, re-read master plan **Ship bar**: agents deliver
**functionality + screens + component sketches**. Do **not** recommend freestyle layout polish,
player-integrated transcript chrome, clip authoring, or pixel DnD as part of feature PGs — those
are Track **21** deferrals or Track **23** operator work.

Record the chosen option in the phase `00-SUMMARY.md` when detailing.

### 5. Recommendation format

Respond with:

- **Recommended PG** and human-readable phase name (e.g. `PG-0 — foundation / abcmemory`).
- **Tracks and step ranges** (e.g. 0.1–0.19, detail IDs 001–019).
- **Prerequisites** satisfied / outstanding.
- **Model mix** (count of Auto / Codex 5.3 / Opus 5 steps).
- **Risk notes** (spike gates, open decisions).
- **Do not** create files until operator confirms (unless they already asked to detail this phase).

---

## Creating deferred plan files (detail + COPY-PASTA)

**Docs and plan files only — no production code** unless operator explicitly moves to
implementation (COPY-PASTA).

### Artifact A — Detail docs (durable)

Path: `docs/proposals/mobile/_master-plan_/phase-1/details/<id>-slug.md` (path already linked from master
plan). Assign `<id>` from the track band in master plan **Appendix E**; grep Appendix C and
`details/` for collisions before committing a new ID.

Use Appendix D template from master plan:

```markdown
# NNN-slug

**Master step:** Track.Step
**Model (author + implement):** <from master plan>
**Status:** draft

## Scope

...

## Acceptance criteria

...

## Web parity references

...

## Verification

...commands per **commands-from-monorepo-root** (full tier: `npm run test:unit`; scoped: `npm run test -w <workspace>` — never `test:unit -w`)...
```

**Depth by Model tier:**

| Model     | Minimum content                                                          |
| --------- | ------------------------------------------------------------------------ |
| Auto      | Scope + acceptance bullets + operator-only notes                         |
| Codex 5.3 | Above + web parity links + file paths + verification commands            |
| Opus 5    | Above + architecture notes, edge cases, spike outcomes, cross-track deps |

Pull parity context from `docs/proposals/mobile/` and existing web code paths when known.

### Artifact B — Phase plan set (transient)

Path: `.llm/plans/active/mobile-<phase-slug>/` (kebab-case, e.g. `mobile-pg0-foundation`).

Required files:

| File                    | Purpose                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `00-SUMMARY.md`         | Phase scope, step list, detail ID range, open decisions locked                         |
| `00-EXECUTION-ORDER.md` | Sequential vs parallel prompts within phase                                            |
| `01-…md`, `02-…md`      | Grouped implementation plans referencing detail docs                                   |
| `COPY-PASTA.md`         | Short prompts; each references a numbered plan file + **Cursor model** + **Reasoning** |

Follow **parallel-plan-execution** (§ Step 5 — **Cursor model** and **Reasoning** required on every prompt):
COPY-PASTA prompts are 3–8 lines; full instructions live in numbered plan files and detail docs.

Each COPY-PASTA prompt must include:

- `Read and execute .llm/plans/active/mobile-<phase-slug>/<NN-plan>.md`
- **Cursor model:** Auto | Codex 5.3 | Opus 5 (match highest-risk step in that prompt; see
  **copy-pasta-recommend-model** rule)
- **Reasoning:** low | medium | high | extra high (thinking depth for that model; see **copy-pasta-recommend-model** rule)
- Reminder: do not run tests during agent work; operator verifies at end

Keep each numbered plan file **under 300 lines**; split if larger.

### After detailing — update master plan

For every step in the phase:

1. Change step line suffix from `— _TBD_` to `— planned`.
2. Update Appendix C `Status` column to `planned`.
3. Do **not** mark `done` until implementation completes.

---

## Implementing a phase (COPY-PASTA)

When operator pastes COPY-PASTA from `mobile-<phase-slug>/`:

1. Execute immediately per **parallel-plan-execution** (paste = instruction).
2. Implement only what the numbered plan and detail docs specify.
3. **Do not run** tests/lint as verification gates during agent work.
4. **After this prompt completes:** mark affected master-plan steps `done`, update Appendix C,
   mark COPY-PASTA prompt `[x]`, update detail doc headers (§ Progress tracking).
5. End with operator verification commands in a fenced `bash` block (**response-ending-make-verify**).

When the **last** prompt in the set finishes (all steps in phase `done`):

1. Remove `.llm/plans/active/mobile-<phase-slug>/` after operator confirmation; do not retain a
   completed-plan archive.
2. If spike gate (2.34) or open decisions changed reality, propose master-plan step edits to
   operator before next phase.

---

## Guardrails (just-in-time core)

- **Never** mass-produce all 349 detail files in one session.
- **Detail at most** the next recommended PG (optionally PG+1 only if fully unblocked and operator
  asks).
- **Respect Model** on each step; bump one tier on retry or unexpected cross-cutting native work.
- **Revise** master plan step text when spikes prove assumptions wrong; do not silently diverge.
- **Separate** durable (`details/`) from transient (`.llm/plans/active/`); archive transient sets
  after implementation.
- Mobile E2E uses Maestro/Detox per open decision — not Playwright make targets.

---

## Quick reference — first phases

Typical early sequence (subject to Appendix C state):

1. PG-0 — Track 0 (001–019): abcmemory, monorepo prep.
2. PG-1 — Track 1 (020–033): `playback-core` extraction.
3. PG-2a — Track 3 (040–055): hello-world Expo app.
4. PG-2b — Track 2 spike (080–092, 113–114): engine + car foundation + go/no-go.
5. PG-3 — Tracks 4 + 5 (150–172, 060–072): CI + mobile E2E harness.

Always re-read Appendix C before recommending; operator may have completed steps out of PG order
during parallel work.

---

## Anti-patterns

| Do not                                                    | Do instead                                                            |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| Write all `details/*.md` upfront                          | Detail one PG at a time                                               |
| Implement while "only detailing"                          | Stop after `planned` status                                           |
| Detail Track 10 before 2.34 done                          | Recommend Track 2 spike completion                                    |
| Duplicate full detail text in COPY-PASTA                  | Reference plan + detail paths                                         |
| Skip Appendix C updates                                   | Keep master plan status in sync after **each** prompt                 |
| Answer "what next" without progress counts                | Always show done / planned / _TBD_ table first                        |
| Batch `done` only at end of phase                         | Mark steps `done` as each COPY-PASTA prompt completes                 |
| `npm run test:unit -w <workspace>` in verification blocks | Full tier: `npm run test:unit`; scoped: `npm run test -w <workspace>` |

---

## Verification (operator, after implementation phase)

Commands depend on phase scope. Examples:

```bash
# PG-0 / docs-only phase — confirm files exist
test -f apps/mobile/AGENTS.md
grep -c 'planned\|done' docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md

# PG-1 playback-core — after operator runs tests
npm run build:packages
npm run test -w @podverse/playback-core
npm run test -w apps/web
npm run lint
```

Always end agent implementation responses with phase-appropriate commands in a fenced `bash` block.
