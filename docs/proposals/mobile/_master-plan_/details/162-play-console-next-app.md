# 162-play-console-next-app

**Master step:** 4.13
**Model (author + implement):** Opus 4.8
**Status:** ready

## Scope

- Operator checklist: separate Google Play app (or clearly isolated internal track) for
  `com.podverse.app.next`.
- Do not upload to production Podverse listing.

## Acceptance criteria

- Runbook section with Play Console checklist
- applicationId `.next` reiterated

## Verification

```bash
rg -n 'Play Console|applicationId|\\.next' docs/operations/mobile/
```
