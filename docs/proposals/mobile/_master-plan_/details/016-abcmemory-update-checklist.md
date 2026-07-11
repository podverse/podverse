# 016-abcmemory-update-checklist

**Master step:** 0.16
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Define abcmemory checklist: when to update `.cursor/` rules/skills vs `.llm/` plans.

## Acceptance criteria

- Checklist in skill or prompt under `.cursor/`
- Distinguishes abcmemory vs .llm/plans per abcmemory-vocabulary rule
- References mobile-master-plan-phasing for implementation phases

## Web parity references

- [.cursor/skills/abcmemory/SKILL.md](.cursor/skills/abcmemory/SKILL.md)
- [.cursor/rules/abcmemory-vocabulary.mdc](.cursor/rules/abcmemory-vocabulary.mdc)

## Verification

```bash
grep -rl "abcmemory checklist" .cursor/ || test -f .cursor/skills/mobile-abcmemory-checklist/SKILL.md
```
