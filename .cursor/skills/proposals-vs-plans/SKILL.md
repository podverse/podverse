---
name: proposals-vs-plans
description: Pick the right artifact when capturing engineering work. Proposals are
  human-oriented RFCs (no length cap, decision-driven, live in `docs/proposals/`). Plans
  are LLM-oriented execution artifacts (capped at ~300 lines per file, action-driven,
  live in `.llm/plans/active/`). Use when the user asks for a design doc, an RFC, or an
  implementation plan, or when a request is large enough that the wrong artifact would
  hurt review or execution.
---

# Proposals vs Plans

Two distinct artifact kinds in this repo. Picking the right one up front saves rework.

## Proposal

- **Audience:** humans reviewing and deciding on direction.
- **Lives in:** [`docs/proposals/`](../../docs/proposals/).
- **Naming:** `EXTENSIONS.md`, `RATE-LIMITING.md` — `SCREAMING-KEBAB.md` for the topic.
- **Status header at top of doc:** one of
  - `Status: Proposed`
  - `Status: Accepted` (link to the resulting plan set or PRs)
  - `Status: Rejected` (one-line reason)
  - `Status: Superseded by docs/proposals/OTHER.md`
- **Length:** no cap. Use prose, mermaid diagrams, alternatives considered, and open
  questions as freely as needed. Readability wins over brevity targets.
- **Tone:** neutral, technical, decision-oriented. No references to chats, tickets, or
  participants — the proposal is the durable record, not a conversation summary.
- **Lifecycle:** `proposed -> accepted | rejected | superseded`. A proposal is rarely
  edited after acceptance; supersede with a new file rather than rewriting history.
- **Decision request section:** every Proposed RFC ends with the explicit set of
  decisions it asks reviewers to confirm.

## Plan

- **Audience:** an LLM agent (or a human running an agent) executing the work.
- **Lives in:** [`.llm/plans/active/<feature>/`](../../.llm/plans/active/) while in
  flight; moves to `.llm/plans/completed/<feature>/` after execution per the
  [`plan-completion`](../plan-completion/SKILL.md) skill.
- **Naming:** numbered files inside a feature directory.
  - `00-EXECUTION-ORDER.md`, `00-SUMMARY.md`, `COPY-PASTA.md` — meta files.
  - `01-foo.md`, `02-bar.md`, … — execution files.
- **Length:** each numbered file capped at ~300 lines; if a step is larger, split it.
  See the [`plan-creation`](../../rules/plan-creation.mdc) rule.
- **Tone:** action-oriented. Lists exact paths to touch, exact changes to make,
  verification commands at the end of each file (per the
  [`response-ending-make-verify`](../response-ending-make-verify/SKILL.md) skill).
- **Lifecycle:** `active -> completed`. Move on completion (single file or whole set
  per the [`plan-completion`](../plan-completion/SKILL.md) skill).

## Decision tree (which one to make)

| Situation                                                           | Artifact                                       |
| ------------------------------------------------------------------- | ---------------------------------------------- |
| Stakeholders need to debate trade-offs or pick between approaches   | Proposal                                       |
| Approach is decided; the work just needs to be carried out          | Plan                                           |
| Substantial / cross-cutting changes with non-obvious design choices | Proposal first, then plan(s) that reference it |
| Single small change, one or two files, obvious approach             | No artifact — just do it                       |
| Multi-step refactor with clear, agreed direction                    | Plan only                                      |

When in doubt: if you would otherwise write a "design considerations" section, you want
a proposal. If you would otherwise write a numbered checklist of file edits, you want a
plan.

## Cross-references

- [`.cursor/rules/plan-creation.mdc`](../../rules/plan-creation.mdc) — the 300-line cap
  and "split into separate files" guidance applies to **plans only**; proposals are out
  of scope for that cap.
- [`.cursor/skills/plan-completion/SKILL.md`](../plan-completion/SKILL.md) — how to
  archive plan files after execution. Proposals do not move; their `Status:` header
  changes instead.
- [`.cursor/skills/parallel-plan-execution/SKILL.md`](../parallel-plan-execution/SKILL.md) —
  for plan sets that benefit from multi-agent execution; complements this skill but
  does not replace it.

## Anti-patterns

- Putting design rationale and trade-offs inside `.llm/plans/active/`. That belongs in a
  proposal under `docs/proposals/`; the plan files reference the proposal.
- Putting step-by-step file edits inside `docs/proposals/`. That belongs in a plan
  set; the proposal points at it.
- Hand-editing an accepted proposal after the fact. Supersede with a new proposal that
  links back, and update the old proposal's `Status:` header to
  `Superseded by docs/proposals/NEW.md`.
- Skipping the `Status:` header on a proposal. Without it, readers cannot tell whether
  the document represents direction the team has accepted.
