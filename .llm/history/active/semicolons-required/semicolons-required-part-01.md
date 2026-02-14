# Feature: semicolons-required (Part 1)

## Metadata

- Started: 2026-02-13
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: None
- Branch: feature/semicolons-required
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

Update repo guidance and linting to require semicolons across JS/TS files.

## Sessions

### Session 1 - 2026-02-13

#### Prompt (Developer)

when i say "make semicolons required" i mean you should start by updating agents, skills, rules, eslint, and anything else so we don't run into this problem in the future, after that is finished we can resume with the plans afterwards

#### Key Decisions

- Add a Cursor rule and update docs and ESLint to require semicolons.

#### Files Changed

- AGENTS.md
- .llm/context/conventions.md
- eslint.config.mjs
- .cursor/rules/semicolons-required.mdc

### Session 2 - 2026-02-13

#### Prompt (Developer)

does your @podverse/.cursor/rules/semicolons-required.mdc rule makes sense? i don't see a difference between good and bad examples

#### Key Decisions

- Fix the semicolons rule example to show missing semicolons in the bad case.

#### Files Changed

- .cursor/rules/semicolons-required.mdc
