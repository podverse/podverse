# 001-cursorignore-native-artifacts

**Master step:** 0.1
**Model (author + implement):** Auto
**Status:** ready

## Scope

Add mobile native build artifact paths to `.cursorignore` so Cursor does not index generated iOS/Android/Expo trees.

## Acceptance criteria

- `.cursorignore` includes `apps/mobile/ios/Pods/`, iOS/Android build dirs, `.expo/`
- Paths match DOCS-MOBILE-LLM-CURSOR-SETUP §2
- No secrets or source paths excluded

## Web parity references

- [docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md §2](docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md)

## Verification

```bash
grep -q "apps/mobile/ios/Pods" .cursorignore
grep -q "apps/mobile/.expo" .cursorignore
```
