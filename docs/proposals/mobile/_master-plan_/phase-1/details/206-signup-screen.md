# 206-signup-screen

**Master step:** 6.7
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Signup screen under `apps/mobile/src/screens/auth/SignUpScreen.tsx` (or similar).
- Fields aligned with web: `email`, `password`, `passwordConfirm` (password1/password2 parity),
  optional listen-stats opt-in if API still requires it.
- Client validation via `@podverse/helpers-validation/client` (`getEmailErrorKey` /
  password helpers — same as web).
- Submit through existing signup `req*` wrapper if present; else document temporary gap and use the
  same path web uses for public signup (must still be cookie-free on mobile).
- `testID`s for Maestro later; link back to login.

## Acceptance criteria

- Validation errors shown before network call when invalid
- Successful signup navigates to verification-pending or login per API contract
- No cookie / `withCredentials` on mobile client

## Web parity references

- [`AuthSignUpForm.tsx`](/apps/web/src/components/Auth/AuthSignUpForm.tsx)
- `@podverse/helpers-validation/client`

## Verification

```bash
# Manual or future Maestro area; smoke compile via Metro
npm run mobile:dev:e2e
```
