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

---

## Related Resources

- [Link to PR]
- [Link to related issues]
