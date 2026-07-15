# 02 — API client, mobile token login, no cookies

Implement master steps **6.3** and **6.10**.

## Detail docs

- [202-mobile-token-login](/docs/proposals/mobile/_master-plan_/details/202-mobile-token-login.md)
- [209-no-cookie-auth](/docs/proposals/mobile/_master-plan_/details/209-no-cookie-auth.md)

## Tasks

1. Mobile `ApiRequestService` factory from `getMobileApiBaseUrl()` /
   [`apiBaseUrl.ts`](/apps/mobile/src/config/apiBaseUrl.ts).
2. Login via `reqAuthMobileToken`; persist tokens; set `AuthContext { mode: 'bearer', token }`.
3. Ensure mobile path never uses `withCredentials` or cookie auth mode.
4. Prefer `reqAuthMobile*` over web cookie wrappers.
5. Mark **6.3**, **6.10** / details **202**, **209** `done`.

Do not run tests during agent work. End with operator verification notes.
