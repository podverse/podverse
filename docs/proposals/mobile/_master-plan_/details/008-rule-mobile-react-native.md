# 008-rule-mobile-react-native

**Master step:** 0.8
**Model (author + implement):** Codex 5.3
**Status:** ready

## Scope

Add `.cursor/rules/mobile-react-native.mdc`: RN boundaries, no Next/ui/orm, tier consumer rules.

## Acceptance criteria

- Rule file with globs for `apps/mobile/**`
- Documents forbidden imports and bridge pattern
- Links playback-core and API client boundaries

## Web parity references

- [docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md)

## Verification

```bash
test -f .cursor/rules/mobile-react-native.mdc
```
