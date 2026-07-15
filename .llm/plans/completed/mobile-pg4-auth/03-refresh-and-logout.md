# 03 — Token refresh + logout revoke

Implement master steps **6.4–6.5**.

## Detail docs

- [203-token-refresh](/docs/proposals/mobile/_master-plan_/details/203-token-refresh.md)
- [204-logout-revoke](/docs/proposals/mobile/_master-plan_/details/204-logout-revoke.md)

## Tasks

1. Single-flight 401 → `reqAuthMobileRefresh` → rotate tokens → one retry.
2. Reuse detection / refresh failure → clear session.
3. Logout via `reqAuthMobileRevoke` + always wipe local tokens/store.
4. Mark **6.4–6.5** / **203–204** `done`.

**Risk:** refresh concurrency and reuse — follow Opus-depth notes in detail 203.

Do not run tests during agent work.
