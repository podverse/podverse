# Feature: k8s-updates (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 11, create `k8s-updates-part-02.md`.

## Metadata

- Started: 2026-04-28
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: None
- Branch: chore/k8s-updates
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

[What problem does this solve? What's the goal?]

## Sessions

### Session 1 - 2026-04-28

#### Prompt (Developer)

[First prompt will go here]

#### Key Decisions

- [Decision and rationale]

#### Files Changed

- [List of files]

### Session 2 - 2026-04-28

#### Prompt (Developer)

there should only be ONE README file in the podverse and metaboost repos. all the other "readme" files should use a file naming pattern that i expect is already in a skill file

#### Key Decisions

- Enforce the documentation-conventions rule for podverse docs: keep only root `README.md`, rename all non-root README files to full-path uppercase-hyphen filenames.
- Rewrite stale links/references from old README paths to the new filenames across tracked files.
- Remove an accidental temporary artifact created during bulk in-place edits.

#### Files Changed

- .llm/history/active/k8s-updates/k8s-updates-part-01.md
- .llm/exports/LLM-EXPORTS.md
- docs/development/llm/DOCS-DEVELOPMENT-LLM.md
- docs/v4v/DOCS-V4V.md
- infra/data/dev/podcast-index-feeds/INFRA-DATA-DEV-PODCAST-INDEX-FEEDS.md
- infra/k8s/INFRA-K8S.md
- infra/k8s/scripts/INFRA-K8S-SCRIPTS.md
- packages/ui/PACKAGES-UI.md
- AGENTS.md
- docs/development/llm/EXPORT-TARGETS.md
- docs/development/llm/GH-EXPORTS-SETUP.md
- docs/development/llm/LLM-EDITOR-ALIGNMENT-PROMPT.md
- scripts/llm/allowed-targets.mjs
- scripts/llm/guard-exports-prompt.sh
- scripts/llm/export-from-cursor.mjs

### Session 3 - 2026-04-28

#### Prompt (Developer)

Why `make test_deps` failed

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Confirmed [`run-linear-migrations.sh`](infra/k8s/base/ops/source/database/runner/run-linear-migrations.sh) pipes each migration into `psql -d "$PSQL_DB"` (from `DB_NAME`), so embedded `\c podverse_management` in SQL was redundant for prod and broke `podverse_management_test`.
- Removed `\c podverse_management` and the preceding comment from [`management/0000_init_helpers.sql`](infra/k8s/base/ops/source/database/linear-migrations/management/0000_init_helpers.sql) to match app `0000` (no meta-command connect).
- Ran `make db_regen_linear_baseline` to refresh [`0003_linear_baseline.sql.gz`](infra/k8s/base/db/source/bootstrap/0003_linear_baseline.sql.gz) and [`0004_seed_linear_migration_history.sql`](infra/k8s/base/db/source/bootstrap/0004_seed_linear_migration_history.sql).
- Verified `make test_deps` completes (app + management test DBs).

#### Files Changed

- infra/k8s/base/ops/source/database/linear-migrations/management/0000_init_helpers.sql
- infra/k8s/base/db/source/bootstrap/0003_linear_baseline.sql.gz
- infra/k8s/base/db/source/bootstrap/0004_seed_linear_migration_history.sql
- .llm/history/active/k8s-updates/k8s-updates-part-01.md

---

## Related Resources

- [Link to PR]
- [Link to related issues]
