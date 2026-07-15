# `.llm/plans/completed/`

Finished plan sets moved from `plans/active/`. Historical record of how large work was broken down and executed.

- Do not start new active work here; create a new folder under `plans/active/`.
- See **plan-completion** skill and [LLM.md](/.llm/LLM.md).

## Recently archived (non-exhaustive)

- [`mobile-helpers-dto-subpath/`](./mobile-helpers-dto-subpath/) — add `@podverse/helpers/dto`
  export; switch mobile `DTOAccount` imports off the helpers barrel; remove AuthProvider TODO.
- [`mobile-i18n-screen-localization/`](./mobile-i18n-screen-localization/) — localize product UI
  (auth + nav titles) beyond Track 17.4; reuse `authentication.*` / `features.*` + mobile
  overlay; wire account locale override.
- [`mobile-auth-nav-tech-debt/`](./mobile-auth-nav-tech-debt/) — post Track 6–7 scaffold follow-ups
  (bootstrap session consistency, post-login `/auth/me`, docs/env clarity, entry hygiene,
  signup/health polish).
