# 006-mobile-agents-md

**Master step:** 0.6
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Create `apps/mobile/AGENTS.md` with allowed/forbidden `@podverse/*` imports and mobile-specific rules.

## Acceptance criteria

- File exists at `apps/mobile/AGENTS.md`
- Lists allowed packages (helpers, helpers-requests, playback-core when ready, etc.)
- Lists forbidden (ui, orm, helpers-browser, etc.)
- Bearer auth note, no cookies

## Web parity references

- [docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md §3](docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md)
- [docs/development/API-CLIENT-BOUNDARIES.md](/docs/development/API-CLIENT-BOUNDARIES.md)

## Verification

```bash
test -f apps/mobile/AGENTS.md
grep -q "@podverse/helpers" apps/mobile/AGENTS.md
```
