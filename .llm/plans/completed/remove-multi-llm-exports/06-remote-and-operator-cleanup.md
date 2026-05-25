# Plan 06 — Remote and operator cleanup

## Objective

Clean up GitHub state left over from export automation **after** Podverse and Metaboost removal PRs merge to `develop`.

## Scope

Both GitHub repos (Podverse and Metaboost). Manual operator steps — not automated in this plan set.

## Prerequisites

- Plans 01–04 (Podverse) merged to `develop`
- Metaboost plans 01–04 merged to `develop`
- Export workflow YAML files no longer on `develop` (Actions will stop triggering)

## Steps (per repo)

Repeat for **Podverse** and **Metaboost** GitHub repositories.

### 1. Close open automation PRs

Find and close PRs:

- Source branch `llm` → target `develop` (incremental export sync)
- Source branch `llm-full` → target `develop` (full export regen)

Use GitHub UI or:

```bash
gh pr list --head llm --state open
gh pr list --head llm-full --state open
# Close each with gh pr close <number>
```

### 2. Delete remote branches

```bash
git push origin --delete llm llm-full
```

Delete local tracking branches if present:

```bash
git branch -d llm llm-full 2>/dev/null || true
```

### 3. Optional: delete `llm` GitHub label

If no longer used after `pr-labeler.yml` change:

```bash
gh label delete llm --yes
```

Or leave the label on closed issues/PRs — harmless if unused going forward.

### 4. Verify Actions

In GitHub → Actions, confirm:

- **LLM exports sync** — workflow file gone (404 or removed from list)
- **LLM exports full** — same
- **LLM exports optional (cloud)** — same

No scheduled runs should remain for deleted workflows.

## Verification

- [ ] No open PRs from `llm` or `llm-full` branches
- [ ] Remote branches `llm` and `llm-full` deleted (both repos)
- [ ] `develop` on both repos has no export pipeline files

## Notes

- If an automation PR merges **after** workflow deletion but **before** branch deletion, close it without merging.
- Tracked export files on old branches become irrelevant once branches are deleted.
