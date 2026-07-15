# 204-logout-revoke

**Master step:** 6.5
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Logout action: call `reqAuthMobileRevoke` with current `refresh_token` when present (idempotent if
  missing/already revoked).
- Always wipe secure storage + clear auth store locally even if revoke network call fails.
- Navigate / show login (or anonymous) UI after logout (wires to screens in 6.6 / 6.9).

## Acceptance criteria

- Uses `POST /auth/mobile/revoke` (not cookie `/auth/logout`)
- Local wipe always runs
- No leftover bearer token in memory store after logout

## Web parity references

- [`reqAuthMobileRevoke`](/packages/helpers-requests/src/api/auth/auth.ts)
- Web logout is cookie-based (`reqAuthLogout`) — do not port

## Verification

```bash
# Covered by Maestro 6.12 when flows land
npm run mobile:e2e:test -- auth-logout
```
