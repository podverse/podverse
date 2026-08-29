# 328-anonymous-login-reconcile

**Master step:** 10.19
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Reconcile anonymous snapshot to server queue on login (web
  `AnonymousPlaybackRestoreController` parity).

## Architecture notes

Follow web restore controller ordering relative to queue hydrate (10.2).

## Edge cases / cross-track deps

- Login while offline
- Conflict between anonymous item and existing server now-playing

## Acceptance criteria

- After login, anonymous now-playing/upcoming merge or replace per web rules
- Snapshot cleared after successful reconcile
- Failure leaves recoverable state without wiping server queue blindly

## Web parity references

- Web: `apps/web/src/components/Queue/AnonymousPlaybackRestoreController.tsx`

## Verification

```bash
npm run mobile:e2e:test -- auth
```

## Depends on

- 10.2, 10.18
