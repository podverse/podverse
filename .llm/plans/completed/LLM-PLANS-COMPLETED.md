# `.llm/plans/completed/`

Finished plan sets moved from `plans/active/`. Historical record of how large work was broken down and executed.

- Do not start new active work here; create a new folder under `plans/active/`.
- See **plan-completion** skill and [LLM.md](/.llm/LLM.md).

## Recently archived (non-exhaustive)

- [`mobile-pg7-pr-prep/`](./mobile-pg7-pr-prep/) — Pre-PR wrap for uncommitted PG-7a/7b + Track 9c:
  consumer i18n locale parity for new `media_player` keys, Android full-player Close documentation
  (Maestro uses Back; manual Close smoke before release), operator verify + commit handoff.
- [`mobile-media-row-actions/`](./mobile-media-row-actions/) — PG-6.6 Track 9c media row action
  affordance parity: web/mobile action inventory, shared `MediaRowActions` (Play + native More
  action sheet with correct queue-next/queue-last keys), migrated all `HomeFeedRow` consumers
  (details 497–499). **Track 9c DONE.**
- [`mobile-pg7b-player/`](./mobile-pg7b-player/) — PG-7b Track 11 mini/full player audio-first:
  mini player, expand-without-reload, full player UI, up-next / segments / speed, sleep / share /
  V4V stub, single-surface anti-pattern doc (details 340–359, 363). Video steps 11.3 / 11.6–11.8 /
  11.15–11.17 deferred (planned).
- [`mobile-pg7a-queue/`](./mobile-pg7a-queue/) — PG-7a Track 10 queue / auto-queue / orchestrator /
  native audio load + queue/playback E2E (details 310–334). **Track 10 DONE.**
- [`mobile-helpers-dto-subpath/`](./mobile-helpers-dto-subpath/) — add `@podverse/helpers/dto`
  export; switch mobile `DTOAccount` imports off the helpers barrel; remove AuthProvider TODO.
- [`mobile-i18n-screen-localization/`](./mobile-i18n-screen-localization/) — localize product UI
  (auth + nav titles) beyond Track 17.4; reuse `authentication.*` / `features.*` + mobile
  overlay; wire account locale override.
- [`mobile-auth-nav-tech-debt/`](./mobile-auth-nav-tech-debt/) — post Track 6–7 scaffold follow-ups
  (bootstrap session consistency, post-login `/auth/me`, docs/env clarity, entry hygiene,
  signup/health polish).
