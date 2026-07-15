# 205-login-screen

**Master step:** 6.6
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Login screen under `apps/mobile/src/screens/auth/LoginScreen.tsx` (or similar).
- Fields: email (or email/username label parity), password; primary submit; link affordances for
  signup (and forgot-password stub OK if not implemented).
- Call auth store / login action from 6.3; show loading on submit; disable double-submit.
- Error states mirroring web: invalid credentials; optional unverified-account message if API
  surfaces it; rate-limit message if status 429.
- `testID`s for Maestro: e.g. `login-email`, `login-password`, `login-submit`, `login-error`.
- Theme via existing `ThemeProvider` / tokens (no hardcoded hex).

## Acceptance criteria

- Successful login leaves authenticated status and dismisses login (or shows authenticated shell)
- Failed login shows error without clearing unrelated UI
- Accessible labels; SecureStore used only via auth layer

## Web parity references

- [`ModalAuthLogin.tsx`](/apps/web/src/components/Modal/ModalAuthLogin.tsx)
- i18n keys: `email_or_username`, `invalid_email_or_password`, etc. (catalog when wired)

## Verification

```bash
npm run mobile:e2e:test -- auth-login
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
