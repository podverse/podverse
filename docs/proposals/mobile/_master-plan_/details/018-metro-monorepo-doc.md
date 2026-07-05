# 018-metro-monorepo-doc

**Master step:** 0.18
**Model (author + implement):** Codex 5.3
**Status:** ready

## Scope

Document Metro monorepo resolver requirements in `APPS-MOBILE.md`.

## Acceptance criteria

- Section on watchFolders, workspace package resolution, build:packages before Metro
- Notes Tier A packages resolve to dist/

## Web parity references

- [docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md §2](docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md)

## Verification

```bash
grep -q -i metro apps/mobile/APPS-MOBILE.md
```
