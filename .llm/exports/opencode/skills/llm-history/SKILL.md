---
name: llm-history
description: LLM history tracking guidelines. Use when updating history files or starting new feature work.
version: 1.0.0
---


# LLM History Tracking

This skill provides guidelines for maintaining LLM development history in the Podverse monorepo.

## Critical Rule: 10-Session Maximum Per File

**Each history file must contain at most 10 sessions.** When session 11 needs to be added, the file must be split.

### Why This Matters

- Prevents context overload for future LLM sessions
- Keeps files manageable and searchable
- Maintains performance when reading history

## File Location Pattern

```
.llm/history/active/[feature-name]/
  [feature-name]-part-01.md      # Sessions 1-10 (always start with part-01)
  [feature-name]-part-02.md      # Sessions 11-20
  [feature-name]-part-03.md      # Sessions 21-30
```

**Always use the `-part-01` suffix from the beginning, even for the first file.**

## When to Split

### Before Adding Session 11

1. Count sessions in current file
2. If file has 10 sessions and you're about to add session 11:
   - Create new file with `-part-02` suffix
   - Add session 11 to the new part file

### Example Split Workflow

**Before (file has 10 sessions):**

```
.llm/history/active/my-feature/
  my-feature-part-01.md  (sessions 1-10)
```

**After (adding session 11):**

```
.llm/history/active/my-feature/
  my-feature-part-01.md  (sessions 1-10, unchanged)
  my-feature-part-02.md  (session 11+, active)
```

## Session Numbering

Sessions are numbered **continuously across parts**:

- Part 01: Sessions 1-10
- Part 02: Sessions 11-20
- Part 03: Sessions 21-30

**Never reset session numbers when splitting.**

## Session Entry Format

```markdown
### Session N - YYYY-MM-DD

#### Prompt (Developer)

[Exact verbatim user prompt - never summarize]

#### Key Decisions

- Decision 1
- Decision 2

#### Files Modified

- path/to/file.ts
- path/to/another.ts
```

## Prompt Source Labels

- **`#### Prompt (Developer)`** - Manually typed by user
- **`#### Prompt (Agent)`** - System-generated (e.g., clicking "Build" on a plan)

## When to Update History

Update history when:

- ✅ Modifying TypeScript/JavaScript files
- ✅ Creating or updating plans
- ✅ Making configuration changes
- ✅ Updating documentation
- ✅ Modifying scripts

Don't update for:

- ❌ Pure Q&A with no file changes
- ❌ Reading files without modifications

## Checking Current Session Count

Before updating history, always:

1. Read the current active history file
2. Count `### Session` headers
3. If count = 10, split before adding new session
4. If count < 10, append to current file

## Example: Counting Sessions

```bash
# Quick check
grep -c "^### Session" .llm/history/active/feature-name/feature-name-part-01.md
```

If output is `10`, create a new `-part-02.md` file before adding session 11.

## Response Ending

Always end file-modifying responses with:

```
**LLM History**: Updated .llm/history/active/[feature]/[file].md (Session N)
```

## Common Mistakes to Avoid

❌ **Don't** exceed 10 sessions per file  
❌ **Don't** reset session numbers when splitting  
❌ **Don't** summarize or paraphrase user prompts  
❌ **Don't** forget to split before adding session 11  
❌ **Don't** create history files without the `-part-01` suffix

✅ **Do** count sessions before updating  
✅ **Do** split files at exactly 10 sessions  
✅ **Do** use continuous session numbering  
✅ **Do** capture exact user prompts verbatim  
✅ **Do** always start with `-part-01` suffix

## Quick Reference

| Sessions in File | Action                                  |
| ---------------- | --------------------------------------- |
| 1-9              | Append to current file                  |
| 10 (adding 11)   | Split file, then append                 |
| 11+              | **ERROR** - file should have been split |

## See Also

- `.llm/exports/opencode/instructions/llm-history-tracking.instructions.md` - Cursor rule with glob triggers
- `.llm/LLM.md` - Complete history system documentation
