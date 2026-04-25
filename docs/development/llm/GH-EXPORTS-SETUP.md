# GitHub configuration for LLM exports (Podverse and Metaboost)

Use the same steps in **each** repository so behavior stays aligned.

## Labels

Ensure the shared `llm` label exists (used for PRs that touch `.cursor` or guidance):

```bash
gh auth login
cd /path/to/podverse   # or metaboost
./scripts/github/setup-all-labels.sh
```

Or one-off: `gh label create llm --color 6E5499 --description "AI editor guidance (.cursor / exports)" 2>/dev/null || true`

## Secrets (optional, not used by default)

The export pipeline is **deterministic** and does **not** require API keys. If you later add a disabled `llm-exports-optional-cloud-llm` job, set a secret only after review:

```bash
gh secret set LLM_EXPORTS_API_KEY --repo owner/repo
```

## Workflows

- **LLM exports sync** (`llm-exports-sync.yml`) — runs on changes to `.cursor` / `scripts/llm` and via **workflow dispatch**. Incremental `sync` (overwrites; does not remove orphan files under a target). Updates branch `llm` and one rolling PR into `develop`.
- **LLM exports full** (`llm-exports-full-sync.yml`) — **workflow dispatch only**. Runs `sync --full` to wipe and regenerate each enabled export target (removes stale files). Updates branch `llm-full` and one rolling PR into `develop`. Use for catch-up after renames or when mirrors drift.

List and run workflows:

```bash
gh workflow list
gh workflow run "LLM exports sync" --ref develop
gh workflow run "LLM exports full" --ref develop
gh run list --workflow "LLM exports sync" --limit 5
gh run list --workflow "LLM exports full" --limit 5
```

## Branch protection (optional)

If `develop` uses required checks, add the **LLM exports sync** / **verify** job to the list after the workflow exists on the default branch. **LLM exports full** is dispatch-only and is not a default PR gate. Configure via the GitHub **Settings → Rules → Rulesets** (or **Branches**), or with `gh api` if your org automates policy.

## Related docs

- [README.md](README.md) — source of truth and hand-edit policy
- [EXPORT-TARGETS.md](EXPORT-TARGETS.md) — per-target input/output and adoption notes
- [`.llm/exports/README.md`](../../.llm/exports/README.md) — opt-in export targets and `github-copilot` layout
