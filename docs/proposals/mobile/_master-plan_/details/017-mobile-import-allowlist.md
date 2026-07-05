# 017-mobile-import-allowlist

**Master step:** 0.17
**Model (author + implement):** Codex 5.3
**Status:** ready

## Scope

Add import allowlist/denylist table to `apps/mobile/AGENTS.md` mirroring shared-vs-divergent doc.

## Acceptance criteria

- Explicit allow/deny table in AGENTS.md
- Matches DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md

## Web parity references

- [docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md)

## Verification

```bash
grep -q "Forbidden" apps/mobile/AGENTS.md
```
