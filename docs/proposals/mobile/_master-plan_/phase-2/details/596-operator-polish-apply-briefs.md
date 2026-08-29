# 596-operator-polish-apply-briefs

**Master step:** 23.2
**Model (author + implement):** Codex 5.3
**Status:** ready

## Scope

- Agents apply **written operator briefs** from 23.1 only — spacing, typography, chrome, empty
  states as specified.
- No freestyle redesign; no new features.

## Acceptance criteria

- Each brief maps to concrete file changes
- Unmentioned screens left alone
- E2E smoke still passes for touched areas

## Web parity references

- Operator briefs + web screens as cited per brief

## Verification

```bash
# Operator: focused Maestro for touched areas after each brief batch
npm run mobile:e2e:test -- <area>
```
