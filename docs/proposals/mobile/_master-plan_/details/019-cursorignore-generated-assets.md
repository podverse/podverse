# 019-cursorignore-generated-assets

**Master step:** 0.19
**Model (author + implement):** Auto
**Status:** done

## Scope

Add `.cursorignore` entries for `apps/mobile/**/*.hbc` and Xcode user data if not covered in 0.1.

## Acceptance criteria

- `.hbc` and xcuserdata patterns present
- No duplicate/conflicting entries

## Web parity references

- [docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md §2](docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md)

## Verification

```bash
grep -q "\.hbc" .cursorignore || grep -q "hbc" .cursorignore
```
