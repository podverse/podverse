# LLM Development History

## Overview

This directory tracks all LLM-assisted development work on the Podverse project. It serves as:
- A historical record of what was built and why
- Context for future LLM sessions
- Documentation of architectural decisions

## Directory Structure

```
.llm/
├── README.md              # This file
├── history/
│   ├── active/            # Features currently in progress
│   │   └── [feature].md   # One file per feature/project
│   └── completed/         # Archived by completion month
│       └── YYYY-MM/
├── context/               # Codebase summaries for LLM context
│   ├── architecture.md    # High-level architecture overview
│   └── conventions.md     # Coding conventions and standards
└── templates/
    └── prompt-template.md # Template for new history entries
```

## How Auto-History Tracking Works

### The Trigger Mechanism

The LLM is reminded to update history via a Cursor rule defined in `.cursor/rules/llm-history-tracking.mdc`. This rule activates when files matching specific glob patterns are modified:

```yaml
globs:
  - "packages/**/*.ts"
  - "apps/**/*.ts"
  - "apps/**/*.tsx"
  - "tools/**/*.ts"
  - ".cursor/plans/**/*.md"
  - "scripts/**/*.sh"
  - "scripts/**/*.ts"
  - "infra/**/*"
```

### When Auto-Tracking MAY NOT Trigger

The rule is **glob-based**, meaning it only activates when you're working on files that match the patterns above. The LLM may forget to update history when:

1. **Documentation-only changes** - Working on `docs/*.md`, `*.md` files outside plans
2. **Configuration changes** - Editing `.cursorrules`, `.cursor/skills/`, root config files
3. **New file types** - Any file extension or directory not in the glob list
4. **Pure Q&A sessions** - Conversations that don't modify files
5. **Complex multi-step work** - When cognitive load causes the LLM to forget auxiliary tasks

### Pre-Commit Hook Backup

A pre-commit hook in `scripts/git-hooks/pre-commit` checks if `.llm/history/` has been modified when committing feature work. This provides a safety net, but catching issues at commit time is later than ideal.

## How to Avoid Missing History Updates

### For Developers

1. **Watch for the confirmation** - At the end of responses that modify files, the LLM should confirm history was updated
2. **Prompt explicitly when needed** - If you notice history wasn't updated, prompt:
   ```
   Update the LLM history with what we just did
   ```
3. **After complex sessions** - Always ask:
   ```
   Did you update the history?
   ```
4. **Use SKIP_HISTORY_CHECK sparingly** - When committing without LLM history (e.g., manual non-LLM work):
   ```bash
   SKIP_HISTORY_CHECK=1 git commit -m "feat: manual change"
   ```

### Common Situations Requiring Manual Prompts

| Situation | What to Say |
|-----------|-------------|
| After plan creation | "Update the history with the plans we created" |
| After documentation work | "Update the history - we modified docs" |
| After config changes | "Update the history with these config changes" |
| Complex multi-file work | "Before we continue, update the history" |
| End of session | "Summarize this session in the history" |

## History Entry Format

Each session should be recorded in this format:

```markdown
### Session N - YYYY-MM-DD
#### Prompt (Developer|Agent)
[Exact verbatim prompt from user]

#### Key Decisions
- Decision or outcome 1
- Decision or outcome 2

#### Files Created
- path/to/new-file.ts

#### Files Modified
- path/to/existing-file.ts
```

### Labels
- `#### Prompt (Developer)` - Manually typed by the user
- `#### Prompt (Agent)` - System-generated (e.g., clicking "Build" on a plan)

## Creating New Feature Histories

1. Copy the template from `templates/prompt-template.md`
2. Create a new file in `history/active/[feature-name].md`
3. Fill in the metadata section
4. Begin documenting sessions

## Completing Features

When a feature is complete:

1. Move the file from `history/active/` to `history/completed/YYYY-MM/`
2. Fill in the "Outcome" section with final summary
3. Link to any related GitHub issues or PRs

## Why This Matters

1. **Context Recovery** - LLMs have no persistent memory between sessions. History helps reconstruct context.
2. **Decision Archaeology** - Understand why decisions were made months later
3. **Onboarding** - New contributors can understand feature evolution
4. **Debugging** - Trace when and why specific changes were introduced
5. **Pattern Learning** - Identify successful approaches and common pitfalls
