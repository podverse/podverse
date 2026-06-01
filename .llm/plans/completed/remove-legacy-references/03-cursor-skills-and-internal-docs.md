# Plan 03 — Cursor skills and internal docs

## Objective

Remove confusing **legacy** from `.cursor/skills`, `.cursor/rules`, and internal dev docs touched by AI contributors.

## Files (known matches)

| File | Suggested rewrite |
| ---- | ----------------- |
| [.cursor/skills/documentation-conventions/SKILL.md](/.cursor/skills/documentation-conventions/SKILL.md) | “**Older:** `index.md`” or “Less preferred: `index.md`”; “from an older directory layout” instead of “legacy structure” |
| [.cursor/skills/linear-sql-greenfield-only/SKILL.md](/.cursor/skills/linear-sql-greenfield-only/SKILL.md) | “arbitrary pre-chain database states” instead of “legacy states” |
| [.cursor/skills/orm/SKILL.md](/.cursor/skills/orm/SKILL.md) | “removed TypeORM migration paths” instead of “legacy TypeORM migration paths” |

## Rules

Scan `.cursor/rules/` — if any rule mentions “legacy” for Podverse product history, rewrite or delete.

Do **not** edit `.llm/exports/` (being removed separately) unless still present on branch.

## Deliverables

- [ ] `.cursor/skills` clean per `rg`
- [ ] `.cursor/rules` clean per `rg`

## Verification

```bash
rg -i '\blegacy\b' .cursor --glob '!**/.llm/**'
```

Expected: **no matches**.
