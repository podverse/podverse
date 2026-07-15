# 05 — Auth me bootstrap + anonymous mode

Implement master steps **6.8–6.9**.

## Detail docs

- [207-auth-me-bootstrap](/docs/proposals/mobile/_master-plan_/details/207-auth-me-bootstrap.md)
- [208-anonymous-mode](/docs/proposals/mobile/_master-plan_/details/208-anonymous-mode.md)

## Tasks

1. On launch: hydrate secure tokens → bearer `reqAuthMe` (refresh once on 401).
2. Status `unknown` while hydrating; then `authenticated` or `anonymous`.
3. Anonymous-first UX with login CTA; keep UI-only Maestro green without login.
4. Gate authenticated-only actions with login prompt.
5. Mark **6.8–6.9** / **207–208** `done`.

Do not run tests during agent work.
