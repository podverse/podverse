# 007-apps-mobile-md

**Master step:** 0.7
**Model (author + implement):** Codex 5.3
**Status:** ready

## Scope

Create `apps/mobile/APPS-MOBILE.md` contributor guide: layout, commands from repo root, toolchain.

## Acceptance criteria

- Sections: layout, dev commands (`npm run dev:mobile` etc.), Nix wrapper, native prerequisites
- Links to master plan phasing skill
- Follow documentation-conventions full-path filename

## Web parity references

- [docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md §4](docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md)
- [.cursor/skills/documentation-conventions/SKILL.md](.cursor/skills/documentation-conventions/SKILL.md)

## Verification

```bash
test -f apps/mobile/APPS-MOBILE.md
```
