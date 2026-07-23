---
name: mobile-abcmemory-checklist
description: abcmemory checklist for mobile work — when to update .cursor/ rules/skills vs .llm/plans; abcremember vocabulary; links mobile-master-plan-phasing.
---

# Mobile abcmemory update checklist

Use when mobile work produces **standing agent guidance** vs **one-off plan artifacts**, or when the
operator says **abcremember** during a mobile phase.

## abcmemory vs `.llm/` (vocabulary)

Per **abcmemory-vocabulary** rule and **abcmemory** skill:

| Location                                                    | Purpose                                          | Examples                 |
| ----------------------------------------------------------- | ------------------------------------------------ | ------------------------ |
| **abcmemory** (`.cursor/`, `.cursorrules`, `.cursorignore`) | Standing instructions Cursor loads every session | rules, skills, prompts   |
| **`.llm/plans/`**                                           | Transient execution plans, COPY-PASTA sets       | `mobile-pg0-foundation/` |
| **`.llm/context/`**, **`.llm/history/`**                    | Human reference, optional notes                  | not agent memory         |
| **`docs/proposals/mobile/`**                                | Durable design + master plan details             | `details/NNN-*.md`       |

**abcremember** writes to **abcmemory** unless the user explicitly asks to store something under
`.llm/`.

## When to update abcmemory (mobile)

Update **`.cursor/`** (or `.cursorrules` / `.cursorignore`) when guidance should apply to **future**
mobile sessions without re-reading a plan:

| Change type                                          | Prefer                                             |
| ---------------------------------------------------- | -------------------------------------------------- |
| Always-on mobile convention                          | `.cursorrules` short note or always-applied rule   |
| Applies only under `apps/mobile/**`                  | Scoped `.cursor/rules/*.mdc` with `globs`          |
| Workflow (E2E reports, flavors, worktrees, playback) | `.cursor/skills/mobile-*/SKILL.md`                 |
| Ignore generated native trees                        | `.cursorignore`                                    |
| Import allowlist / app entry                         | `apps/mobile/AGENTS.md` (app-local, not abcmemory) |

Do **not** duplicate the same rule in abcmemory and `apps/mobile/AGENTS.md` — link between them.

## When to use `.llm/plans/` instead

Use **`.llm/plans/active/mobile-<phase-slug>/`** for:

- COPY-PASTA execution prompts for a **phase** (PG-0, PG-1, …)
- Grouped implementation steps that will be **archived** to `completed/` when done
- Temporary coordination files (`00-EXECUTION-ORDER.md`, numbered plan files)

Follow **plan-completion** and **mobile-master-plan-phasing** when archiving.

## When to use `docs/proposals/mobile/_master-plan_/details/`

- Per-step **durable** design + acceptance criteria linked from [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
- Status lifecycle: `draft` → `planned` → `done` on the detail doc header
- Not loaded as Cursor memory — agents reach them via master plan links or explicit `@` paths

## Mobile phase workflow

1. Operator asks what's next → **mobile-master-plan-phasing** recommends PG.
2. Detail docs + COPY-PASTA set created under `.llm/plans/active/` (defer implementation).
3. Operator pastes COPY-PASTA → agent implements; marks master-plan steps **done**.
4. Standing lessons (new rule, skill tweak) → **abcremember** into `.cursor/` using this checklist.
5. Archive plan set to `.llm/plans/completed/` when phase finishes.

## Quick decision tree

```text
Will every future mobile agent need this?
  yes → abcmemory (.cursor/ or .cursorrules / .cursorignore)
  no, only this PG batch → .llm/plans/active/
  no, durable spec for one master step → details/NNN-slug.md
  no, human proposal only → docs/proposals/mobile/ (not abcmemory)
```

## Related

- **abcmemory** — placement guide and abcremember workflow
- **llm-cursor-source** — commit policy for `.cursor/` changes
- **mobile-master-plan-phasing** — PG operator loop; track `##` headings get ` (DONE)` when
  every step in that track is `done` (see that skill § Track section headers)
