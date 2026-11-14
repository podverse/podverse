# `.cursor/prompts/`

Reusable agent-facing prompt snippets (abcmemory). One topic per kebab-case `.md` file.

- Use for copy-paste or @-reference blocks that are not full skills or rules.
- Do not put human plan/history templates here — use `.llm/templates/` instead.
- When the user says **abcremember** with prompt-shaped guidance, prefer this directory.
- See **abcmemory** skill and [LLM-TEMPLATES.md](/.llm/templates/LLM-TEMPLATES.md).
- [v4-to-v5-migration-guided.md](v4-to-v5-migration-guided.md) —
  current way to resume. One chunk, then stop and ask. Do not commit or push.
- [v4-to-v5-migration-inventory-overnight.md](v4-to-v5-migration-inventory-overnight.md) —
  finished inventory pass. Do not run it for new work.
- [v4-full-local-migration-rehearsal.md](v4-full-local-migration-rehearsal.md) —
  overnight local migration rehearsal. Pilot, then sample, then full, on Cursor Grok 4.7.
