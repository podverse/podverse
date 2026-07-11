# 004-exclude-mobile-test-unit

**Master step:** 0.4
**Model (author + implement):** Auto
**Status:** done

## Scope

Exclude `apps/mobile` from root `test:unit` orchestration until RN Vitest is configured.

## Acceptance criteria

- `scripts/ci/run-workspaces.mjs` invocation excludes `apps/mobile` OR mobile has no `test` script until ready
- Root `npm run test:unit` does not fail on missing mobile tests

## Web parity references

- [package.json test:unit script](/package.json test:unit script)

## Verification

```bash
grep "exclude apps/mobile" package.json || grep -A2 test:unit package.json
```
