# COPY-PASTA — mobile-pg4-auth (Track 6)

Use one prompt per agent. Run **in order** from `00-EXECUTION-ORDER.md`.

After each prompt: mark affected master-plan steps + Appendix C + detail headers `done`; tick `[x]`
here. Agents do not run tests — operator verifies.

## Step 1 — Secure storage + auth store

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-pg4-auth/01-secure-storage-and-store.md
Also read details 200-secure-storage-dependency and 201-auth-store.
Implement master steps 6.1–6.2. Mark those steps done when finished.
Do not run tests during agent work; end with operator verification commands.
```

## Step 2 — API client + token login + no cookies

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-pg4-auth/02-api-client-token-no-cookie.md
Also read details 202-mobile-token-login and 209-no-cookie-auth.
Implement master steps 6.3 and 6.10. Mark those steps done when finished.
Do not run tests during agent work.
```

## Step 3 — Refresh + logout

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg4-auth/03-refresh-and-logout.md
Also read details 203-token-refresh and 204-logout-revoke.
Implement master steps 6.4–6.5 (single-flight refresh, reuse wipe, revoke+local wipe).
Mark those steps done when finished. Do not run tests during agent work.
```

## Step 4 — Login + signup screens

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-pg4-auth/04-login-signup-screens.md
Also read details 205-login-screen and 206-signup-screen.
Implement master steps 6.6–6.7 with Maestro testIDs. Mark done when finished.
Do not run tests during agent work.
```

## Step 5 — Bootstrap + anonymous

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg4-auth/05-bootstrap-and-anonymous.md
Also read details 207-auth-me-bootstrap and 208-anonymous-mode.
Implement master steps 6.8–6.9 (anonymous-first). Mark done when finished.
Do not run tests during agent work.
```

## Step 6 — E2E login + logout + archive

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-pg4-auth/06-e2e-login-logout.md
Also read details 210-e2e-login-screenshot and 211-e2e-logout.
Add auth-login / auth-logout Maestro flows. Mark 6.11–6.12 done; archive this plan set
to .llm/plans/completed/mobile-pg4-auth/. Do not run Maestro in the agent; end with
cumulative operator verification for Track 6.
```
