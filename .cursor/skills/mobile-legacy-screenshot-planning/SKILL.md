---
name: mobile-legacy-screenshot-planning
description: Turn legacy podverse-rn app screenshots into Phase 2 nextgen mobile plans. Use when the operator pastes screenshots of the legacy/v4 mobile app, asks to plan a mobile screen area from legacy screenshots, or asks what to build next in mobile master plan Phase 2.
---

# Legacy screenshots → Phase 2 plans

Phase 2 of the mobile master plan is **operator-guided**. The operator pastes screenshots of the
**legacy app** (`../podverse-rn`, a.k.a. podverse-rn / v4 mobile) and the agent turns them into
nextgen plans. This skill defines that loop.

Phase index: [PHASES.md](/docs/proposals/mobile/_master-plan_/PHASES.md).
Active plan: [Phase 2 master plan](/docs/proposals/mobile/_master-plan_/phase-2/001-MASTER-PLAN-PHASE-2.md).

## Non-negotiables

1. **Ask before planning.** Screenshots are a prompt for questions, not a spec. Never jump straight
   to writing plan files. See § Question checklist.
2. **Never store the images.** Screenshots stay in chat. Do not write image files into `docs/`,
   `.llm/`, or `.artifacts/`, and do not ask the operator to commit them. Convert what you see into
   **written** observations and plan text.
3. **Legacy is inspiration, not a port target.** Per
   [`legacy-app-reference`](/.cursor/rules/legacy-app-reference.mdc), do not assume legacy
   navigation, storage, API shapes, or UX are right for nextgen. Say when nextgen already has a
   better pattern.
4. **Bottom-tab layouts intentionally differ.** A screenshot from the previous-generation app shows
the previous-generation bottom tabs; that tab arrangement is not a nextgen navigation
specification. Nextgen is expected to use a different bottom-tab layout, so do not classify tab
differences as a parity gap or port the previous-generation tabs without an explicit product
decision.
5. **One area at a time.** The operator batches screenshots per screen area (Home & browse, Player,
   Library, …). Do not expand scope into adjacent areas without asking.

## The loop

```text
1. Operator pastes a screenshot batch for one area.
2. Agent describes what it sees, then asks decision-blocking questions (AskQuestion).
3. Operator answers.
4. Agent writes a locked decision list, then detail docs + COPY-PASTA set.
5. Operator pastes COPY-PASTA prompts; agent implements, marks steps done.
6. Operator verifies on device. Area closes. Repeat.
```

### Step 2 — describe, then ask

**First, read the current nextgen screen.** Before asking anything, inspect the matching directory
under `apps/mobile/src/screens/` (grouped by area: `home/`, `podcast/`, `episode/`, `player/`,
`library/`, `search/`, `more/`, `profile/`, `rss/`, `auth/`, `album/`, `artist/`, `clip/`,
`notifications/`, `v4v/`) plus its hooks, repositories under `src/data/`, and the matching
`apps/mobile/e2e/<area>.yaml` flow. Report what already exists. The operator has asked for this
explicitly — it prevents questions the codebase already answers and turns the conversation into a
real gap analysis.

Then open with a short read-back structured as **three lists**:

| List                            | Contents                                        |
| ------------------------------- | ----------------------------------------------- |
| **Already have**                | Nextgen features present and working            |
| **Legacy has, nextgen doesn't** | The actual gap — the candidate work             |
| **Nextgen has, legacy doesn't** | Deliberate improvements to protect, not regress |

This proves you read both the images and the code, and gives the operator a cheap chance to correct
you before any planning happens.

Then ask. Prefer `AskQuestion` with concrete options over open prose questions, and lead each option
list with your recommendation. **Ask generously** — the operator has explicitly asked for more
questions rather than fewer. The cost of a wrong assumption here is a wasted plan set.

### Question checklist

Work through these categories and ask about everything genuinely undecided. Skip what the screenshot
plus existing nextgen code already answers.

| Category                           | Ask about                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Keep / drop / change**           | Which visible features carry over? Which were legacy mistakes? Anything missing that should be added? |
| **Information architecture**       | Does nextgen keep the same screen boundaries and navigation depth, or collapse/split them?            |
| **Actions inventory**              | Every button, row action, long-press, and overflow-sheet item — which survive?                        |
| **Empty / loading / error states** | What shows with no data, while loading, offline, or on failure?                                       |
| **Auth gating**                    | Logged-out behavior, and anything gated behind membership                                             |
| **Data source**                    | Existing API endpoint, existing repository, or new work? Offline behavior?                            |
| **Web parity**                     | Should this match `apps/web`, match legacy, or diverge deliberately?                                  |
| **Visual specifics**               | Density, ordering, iconography, artwork sizes — only where the screenshot is ambiguous                |
| **Scope boundary**                 | What is explicitly out of scope for this area?                                                        |

Two anti-patterns to avoid: asking about things you could determine by reading nextgen code, and
bundling several real decisions into one vague question.

### Step 4 — capture decisions before planning

Write the operator's answers into the area's `00-SUMMARY.md` as a **locked decision list** before any
implementation plan. Each entry: the question, the decision, and one line of rationale. This is what
replaces Phase 1's Track 23 "operator briefs".

### Step 5 — plan files

Detail docs: `docs/proposals/mobile/_master-plan_/phase-2/details/<id>-<slug>.md`, ID band
**700–899** (see [PHASES.md](/docs/proposals/mobile/_master-plan_/PHASES.md) § Detail ID bands). Use
the Phase 1 Appendix D template shape: Scope / Acceptance criteria / Web parity references /
Verification.

Plan set: `.llm/plans/active/mobile-p2-<area>/` with `00-SUMMARY.md`, `00-EXECUTION-ORDER.md`,
numbered plan files, and `COPY-PASTA.md`. Follow
[`parallel-plan-execution`](/.cursor/skills/parallel-plan-execution/SKILL.md) — every COPY-PASTA
prompt needs **Cursor model** and **Reasoning** lines
([`copy-pasta-recommend-model`](/.cursor/rules/copy-pasta-recommend-model.mdc)). Keep each plan file
under 300 lines. Remove the completed Phase 2 plan set after the operator confirms the area is
closed; do not retain a completed-plan archive
([`plan-completion`](/.cursor/skills/plan-completion/SKILL.md)).

## Phase 2 changes the ship bar

Phase 1 told agents to stop at functional sketches and defer layout to Track 23. **That no longer
applies.** In Phase 2, visual resolution is part of each area's definition of done, driven by the
screenshots and the operator's answers. Agents still do not invent visual direction on their own — if
the screenshots and answers do not settle a layout question, ask rather than guess.

Existing constraints that **do** still apply: shared primitives and theme tokens over hardcoded
values ([`mobile-theme-parity`](/.cursor/skills/mobile-theme-parity/SKILL.md)), i18n for all
user-facing strings ([`i18n-user-facing-strings`](/.cursor/rules/i18n-user-facing-strings.mdc)),
`FlatList` / `SectionList` for user-data lists
([`mobile-list-virtualization`](/.cursor/rules/mobile-list-virtualization.mdc)), and E2E coverage for
feature changes ([`mobile-feature-requires-e2e`](/.cursor/rules/mobile-feature-requires-e2e.mdc)).

## Reading the legacy source

Screenshots show _what_; the legacy source shows _why_. When a screenshot raises a behavior question,
it is fine to read `../podverse-rn/src/screens/<Name>Screen.tsx` — the operator sharing screenshots
counts as the explicit legacy-reference request that
[`legacy-app-reference`](/.cursor/rules/legacy-app-reference.mdc) requires. Do not edit or publish
from that checkout.

## Verification

Mobile E2E only — never `make e2e_*`, which is web. End implementation responses with the narrowest
Maestro report command per
[`mobile-e2e-screenshots`](/.cursor/skills/mobile-e2e-screenshots/SKILL.md) and
[`response-ending-make-verify`](/.cursor/skills/response-ending-make-verify/SKILL.md). Do not run
tests during agent work.
