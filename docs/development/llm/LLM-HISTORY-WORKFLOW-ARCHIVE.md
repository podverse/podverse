# LLM history workflow (archived reference)

This document preserves the **optional human workflow** for maintaining notes under `.llm/history/`. It is **not** Cursor agent policy. The file is listed in `.cursorignore` so IDE AI features do not load it by default.

---

## Former Cursor rule: History Tracking (Essential)

When modifying **any** files in this workspace, update `.llm/history/active/[feature]/[feature].md` (or the latest part file):

```markdown
### Session N - YYYY-MM-DD
#### Prompt (Developer|Agent)
[Exact verbatim prompt]
#### Key Decisions
- Decision 1
#### Files Created/Modified
- path/to/file.ts
```

### 10-Session Limit (Hard Rule)

Each history file is limited to **10 sessions maximum** to prevent context overload.

#### When to Split

When a history file reaches 10 sessions and you need to add session 11:

1. Rename the current file to include `-part-NN` suffix
2. Create a new part file for continued development

#### File Naming Convention

Each feature has its own directory:

```
.llm/history/active/
  simple-feature/
    simple-feature.md                  # Single file (sessions 1-10)
  long-feature/
    long-feature-part-01.md            # Sessions 1-10 (renamed when split)
    long-feature-part-02.md            # Sessions 11-20
    long-feature-part-03.md            # Sessions 21-30, current
```

#### Part File Structure

Each part file should include:

- Same metadata header (Started, Author, Context) for standalone reference
- Sessions numbered continuously (not reset per part)
- Only the **latest part** is updated during active development

#### Example Split

Before (file has 10 sessions, need to add 11th):

```
.llm/history/active/my-feature/
  my-feature.md
```

After:

```
.llm/history/active/my-feature/
  my-feature-part-01.md  (sessions 1-10, renamed from my-feature.md)
  my-feature-part-02.md  (sessions 11+, active)
```

End every file-modifying response with: **LLM History**: Updated `.llm/history/active/[feature]/[file].md` (Session N).

---

## Former `.cursorrules` section: HISTORY TRACKING (Essential)

**Applies to every file-modifying response in this repo** — no exception for path or task size. When in doubt, update history.

Before work: Check/create `.llm/history/active/[feature].md` (or `[feature]/[feature]-part-01.md`)

After changes, update with:

- Session date, user prompt (EXACT text), decisions, files

### Prompt Recording (CRITICAL)

**Always use the user's EXACT, FULL prompt text.** Never summarize or paraphrase.

- Copy the prompt verbatim, preserving original wording
- Include short confirmations ("yes", "continue") as-is
- For multi-message exchanges, capture each message

### Prompt Source Labeling (CRITICAL)

**Differentiate prompt sources using labels:**

- `#### Prompt (Developer)` — Manually typed by the user
- `#### Prompt (Agent)` — System-generated (e.g., clicking "Build" on a plan)

### Real-Time Capture (CRITICAL)

**If a response will modify files, log the prompt FIRST.**

- **Start of response**: Log prompt to `.llm/history/active/[feature].md`
- **End of response**: Update with files changed and key decisions

Skip logging for pure Q&A or explanations that don't change files.

End file-modifying responses with: **LLM History**: Updated `.llm/history/active/[feature].md`

---

## Former skill: LLM History Tracking

This skill provided guidelines for maintaining LLM development history in the Podverse monorepo.

### Critical Rule: 10-Session Maximum Per File

**Each history file must contain at most 10 sessions.** When session 11 needs to be added, the file must be split.

#### Why This Matters

- Prevents context overload for future LLM sessions
- Keeps files manageable and searchable
- Maintains performance when reading history

### File Location Pattern

```
.llm/history/active/[feature-name]/
  [feature-name]-part-01.md      # Sessions 1-10 (always start with part-01)
  [feature-name]-part-02.md      # Sessions 11-20
  [feature-name]-part-03.md      # Sessions 21-30
```

**Always use the `-part-01` suffix from the beginning, even for the first file.**

### When to Split

#### Before Adding Session 11

1. Count sessions in current file
2. If file has 10 sessions and you're about to add session 11:
   - Create new file with `-part-02` suffix
   - Add session 11 to the new part file

### Session Numbering

Sessions are numbered **continuously across parts**:

- Part 01: Sessions 1-10
- Part 02: Sessions 11-20
- Part 03: Sessions 21-30

**Never reset session numbers when splitting.**

### Session Entry Format

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

### Prompt Source Labels

- **`#### Prompt (Developer)`** - Manually typed by user
- **`#### Prompt (Agent)`** - System-generated (e.g., clicking "Build" on a plan)

### When to Update History

Update history when:

- Modifying TypeScript/JavaScript files
- Creating or updating plans
- Making configuration changes
- Updating documentation
- Modifying scripts

Don't update for:

- Pure Q&A with no file changes
- Reading files without modifications

### Checking Current Session Count

Before updating history, always:

1. Read the current active history file
2. Count `### Session` headers
3. If count = 10, split before adding new session
4. If count < 10, append to current file

### Example: Counting Sessions

```bash
grep -c "^### Session" .llm/history/active/feature-name/feature-name-part-01.md
```

If output is `10`, create a new `-part-02.md` file before adding session 11.

### Response Ending

Always end file-modifying responses with:

```
**LLM History**: Updated .llm/history/active/[feature]/[file].md (Session N)
```

### Common Mistakes to Avoid

- **Don't** exceed 10 sessions per file
- **Don't** reset session numbers when splitting
- **Don't** summarize or paraphrase user prompts
- **Don't** forget to split before adding session 11
- **Don't** create history files without the `-part-01` suffix

### Quick Reference

| Sessions in File | Action                                  |
| ---------------- | --------------------------------------- |
| 1-9              | Append to current file                  |
| 10 (adding 11)   | Split file, then append                 |
| 11+              | **ERROR** - file should have been split |
