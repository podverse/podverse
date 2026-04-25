---
name: plan-completion
description: When you finish a plan file in active/, automatically move it to completed/. If it's the
  last plan in its set, move the whole set. Use when completing any plan under .llm/plans/active/.
---


# Plan Completion and Archiving

When you **finish executing** a plan file that lives in `.llm/plans/active/`, archive it (and
optionally its whole set) without asking the user.

## Automatic Move (Single Plan)

1. **After** you have finished executing a plan file (all steps done, verification complete), move
   that plan file from `active/` to `completed/`, preserving subdirectory structure.
2. **Do not ask** "Would you like me to mark this plan as completed?" — move it automatically.

Example:

```bash
mv .llm/plans/active/dependabot-prs/plan-pr-107.md \
   .llm/plans/completed/dependabot-prs/
```

## When It's the Last Plan in a Set — Move the Whole Set

A **set** is any group of plan files that belong together, for example:

- **Execution order**: Files listed in `migration-00-EXECUTION-ORDER.md`, `EXECUTION.md`, or similar.
- **Copy-pasta prompts**: All plans referenced by a `migration-COPY-PASTA.md` or `*-COPY-PASTA.md`.
- **Same feature directory**: All `.md` files under one `active/<feature>/` directory (e.g.
  `active/dependabot-prs/`, `active/bundle-optimizations/`).

If the plan you just finished is the **last** plan in that set (no other plan in the set remains in
`active/`), then move **all** plan files in that set from `active/<feature>/` to
`completed/<feature>/` in one go. Preserve the same directory structure under `completed/`.

How to tell it's the "last":

- You just completed the final step in an execution-order or copy-pasta list; or
- After moving the file you just completed, the same `active/<feature>/` directory would have no
  other plan files left (or only index/summary files that should move with the set).

When moving a set, move the entire directory so that `completed/<feature>/` contains the same
files that were under `active/<feature>/`.

Example (last plan in set — move whole directory):

```bash
mv .llm/plans/active/dependabot-prs .llm/plans/completed/
```

## Preserve Structure

Always keep the same relative path under `completed/` as under `active/`:

- `active/feature-name/01-part.md` → `completed/feature-name/01-part.md`
- `active/feature-name/subdir/02-part.md` → `completed/feature-name/subdir/02-part.md`

## Optional: Update References

If a master plan or index (e.g. `00-master-plan.md`, `00-SUMMARY.md`, or `.llm/LLM.md`) references the moved
plan(s) by path, update those references to point at `completed/` instead of `active/` where
appropriate.

## Summary

| Situation                       | Action                                         |
| ------------------------------- | ---------------------------------------------- |
| Finished one plan in a set      | Move only that plan file to `completed/`       |
| Finished the last plan in a set | Move the whole set (directory) to `completed/` |
| Don't ask                       | Archive automatically after the plan is done   |
