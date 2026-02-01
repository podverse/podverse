# Feature: autopilot-prompt (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for
> development, you can delete this file and the containing directory. The history
> tracking system helps document LLM-assisted decisions but is not required for
> contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 11,
> create `autopilot-prompt-part-02.md`.

## Metadata

- Started: 2026-01-31
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: None
- Branch: chore/query-param-type-cleanup
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

Improve the autopilot prompt template to work with plans that don't share a filename
prefix.

## Sessions

### Session 1 - 2026-01-31

#### Prompt (Developer)

there is no guarantee that the plans will be prefixed with "migration-" the prefix could
be anything, the autopilot prompt should be generic enough to work with those. update
the autopilot prompt so it will work

#### Key Decisions

- Clarified that the pasted plan content is the source of truth regardless of filenames.
- Updated usage to instruct pasting full plan content, not references.

#### Files Changed

- .llm/templates/plan-execution-autopilot-prompt.md
- .llm/history/active/autopilot-prompt/autopilot-prompt-part-01.md

---

## Related Resources

- [Link to PR]
- [Link to related issues]
