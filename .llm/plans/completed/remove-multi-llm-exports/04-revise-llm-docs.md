# Plan 04 — Revise LLM docs (Podverse)

## Objective

Remove export-specific documentation and replace the main LLM policy doc with a **Cursor-only** guide.

## Scope

`docs/development/llm/` and inbound links from other docs.

## Steps

### 1. Delete export-specific docs

Remove:

- `docs/development/llm/EXPORT-TARGETS.md`
- `docs/development/llm/GH-EXPORTS-SETUP.md`
- `docs/development/llm/LLM-EDITOR-ALIGNMENT-PROMPT.md`
- `docs/development/llm/CURSOR-COPILOT-SYNC.md`

### 2. Rewrite `DOCS-DEVELOPMENT-LLM.md`

Replace with a short Cursor-only policy (~40–60 lines). Suggested sections:

1. **Source of truth** — `.cursor/skills/`, `.cursor/rules/`, `.cursorrules`, `.cursorignore`
2. **What to commit** — only `.cursor/` source when changing AI guidance
3. **Plans and history** — `.llm/plans/`, optional `.llm/history/`; link to plan-completion skill
4. **What we removed** — one sentence: no multi-editor export mirrors (for archaeologists)
5. **Related** — `AGENTS.md`, `.llm/LLM.md`, `docs/development/llm/LLM-HISTORY-WORKFLOW-ARCHIVE.md` if still relevant

**Do not** mention: `llm` branch, `llm-full`, Copilot, OpenCode, `npm run llm:exports:*`, `LLM_EXPORT_ALLOW_LOCAL`.

### 3. Fix inbound links

Search and update docs that linked to deleted files:

```bash
rg 'EXPORT-TARGETS|GH-EXPORTS-SETUP|LLM-EDITOR-ALIGNMENT|CURSOR-COPILOT-SYNC|LLM-EXPORTS\.md|\.llm/exports' docs .cursor AGENTS.md
```

Common fix: point to `DOCS-DEVELOPMENT-LLM.md` or remove the link.

### 4. Keep history archive doc

`docs/development/llm/LLM-HISTORY-WORKFLOW-ARCHIVE.md` — keep if still useful for humans; remove export references inside it if any.

## Key files

| Path | Action |
| ---- | ------ |
| `docs/development/llm/EXPORT-TARGETS.md` | Delete |
| `docs/development/llm/GH-EXPORTS-SETUP.md` | Delete |
| `docs/development/llm/LLM-EDITOR-ALIGNMENT-PROMPT.md` | Delete |
| `docs/development/llm/CURSOR-COPILOT-SYNC.md` | Delete |
| `docs/development/llm/DOCS-DEVELOPMENT-LLM.md` | Rewrite |

## Verification

```bash
rg 'EXPORT-TARGETS|GH-EXPORTS-SETUP|LLM-EDITOR-ALIGNMENT|github-copilot|opencode-instructions' docs .cursor AGENTS.md \
  --glob '!**/.llm/plans/completed/**'
# Expect no matches (or only the "what we removed" sentence in DOCS-DEVELOPMENT-LLM.md)
```

## Acceptance checklist

- [ ] Four export docs deleted
- [ ] `DOCS-DEVELOPMENT-LLM.md` is Cursor-only
- [ ] No broken inbound links to deleted docs
