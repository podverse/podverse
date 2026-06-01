---
name: git-worktree-sibling
description: Create and use Podverse git worktrees in sibling directories named podverse_<branch_slug> (underscores). Use when starting feature work, moving WIP off the main checkout, or opening the correct worktree path for a branch.
---

# Git worktree — sibling directories

## When to use

- Starting or continuing work on a **feature branch** without leaving `podverse` on `develop`.
- Moving in-progress changes out of the primary checkout into a dedicated directory.
- Telling the agent **which folder** to edit for a given branch.

## Layout

| Role                                 | Path                                                    |
| ------------------------------------ | ------------------------------------------------------- |
| Primary checkout (stay on `develop`) | `/Users/mitcheldowney/repos/pv/podverse`                |
| Parent of all worktrees              | `/Users/mitcheldowney/repos/pv/`                        |
| Feature worktree                     | `/Users/mitcheldowney/repos/pv/podverse_<branch_slug>/` |

Worktrees are **siblings** of `podverse`, not subdirectories inside it.

## Directory naming (canonical)

```text
podverse_<branch_slug>
```

Derive `<branch_slug>` from the git branch name:

1. Replace every `/` with `_`
2. Replace every `-` with `_`

Examples:

| Branch                       | Worktree directory                  |
| ---------------------------- | ----------------------------------- |
| `feature/tracking-consent`   | `podverse_feature_tracking_consent` |
| `feature/page-navigation-ux` | `podverse_page_navigation_ux`       |
| `chore/typeorm-v1`           | `podverse_chore_typeorm_v1`         |
| `llm/cursor-hooks`           | `podverse_llm_cursor_hooks`         |

Older worktrees may use hyphens (e.g. `podverse-typeorm-v1`); **prefer the underscore form** for new worktrees.

## Create a worktree

Run from the primary repo. The branch must **not** be checked out in `podverse`.

```bash
cd /Users/mitcheldowney/repos/pv/podverse

# ensure primary checkout is on develop (or another base branch)
git checkout develop

git worktree add ../podverse_feature_tracking_consent feature/tracking-consent
```

Create a new branch at the same time:

```bash
git worktree add -b feature/my-feature ../podverse_feature_my_feature develop
```

## Move WIP from primary checkout into a worktree

When `podverse` already has the feature branch checked out with local changes:

```bash
cd /Users/mitcheldowney/repos/pv/podverse
git stash push -u -m "feature-name wip"
git checkout develop
git worktree add ../podverse_feature_tracking_consent feature/tracking-consent
cd ../podverse_feature_tracking_consent
git stash pop
```

Use `git stash push -u` so **untracked** files (e.g. `.llm/plans/active/...`) move with the stash.

## Daily workflow

- **Edit feature code** in the sibling worktree (`podverse_feature_*`), not in `podverse` unless intentionally on `develop`.
- **Commands** still run from that worktree’s root (same as monorepo root): `./scripts/nix/with-env npm run lint`, `make e2e_test_web_report_spec`, etc.
- **Open in Cursor** using the sibling folder path (add to workspace or open folder).

List worktrees:

```bash
cd /Users/mitcheldowney/repos/pv/podverse
git worktree list
```

## Remove a worktree

After the branch is merged and the directory is no longer needed:

```bash
cd /Users/mitcheldowney/repos/pv/podverse
git worktree remove ../podverse_feature_tracking_consent
git worktree prune
```

Delete the branch separately if desired (`git branch -d feature/tracking-consent`).

## Agent rules

1. Before editing files, confirm **which worktree** matches the user’s branch (`git worktree list` or ask).
2. Do **not** implement feature work on `podverse` while it is on `develop` if a sibling worktree exists for that branch.
3. When the user names a branch (e.g. `feature/tracking-consent`), resolve the directory as `podverse_feature_tracking_consent` under `repos/pv/`.
4. Plans for deferred work live under `.llm/plans/active/` in the **worktree** that owns the feature branch.

## Related

- Contributor LLM overview: [docs/development/llm/DOCS-DEVELOPMENT-LLM.md](../../../docs/development/llm/DOCS-DEVELOPMENT-LLM.md)
- Nix wrapper (run from worktree root): [nix-terminal-wrapper](../nix-terminal-wrapper/SKILL.md) skill / `.cursor/rules/nix-terminal-wrapper.mdc`
