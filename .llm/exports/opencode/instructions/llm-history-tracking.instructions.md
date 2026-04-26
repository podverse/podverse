---
description: "LLM history tracking — essential for any file-modifying response in this repo"
applyTo: "**/*"
---

# History Tracking (Essential)

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

## 10-Session Limit (Hard Rule)

Each history file is limited to **10 sessions maximum** to prevent context overload.

### When to Split

When a history file reaches 10 sessions and you need to add session 11:

1. Rename the current file to include `-part-NN` suffix
2. Create a new part file for continued development

### File Naming Convention

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

### Part File Structure

Each part file should include:
- Same metadata header (Started, Author, Context) for standalone reference
- Sessions numbered continuously (not reset per part)
- Only the **latest part** is updated during active development

### Example Split

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
