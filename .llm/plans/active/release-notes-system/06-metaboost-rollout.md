# 06 — metaboost rollout

## Goal

Bring the podverse system to `../metaboost` unchanged in behavior: same scripts, same contract,
same enforcement. Work only inside `../metaboost`; do not edit podverse.

metaboost has its own plan-tracking rule (`plan-execution-completion-tracking.mdc`); this plan
stays in the podverse plan set, so track it here, not in metaboost's `.llm/`.

## Repo facts

- Root version `0.1.16`; tags `0.1.16-staging.0..2`; **no formal tag yet**.
- Apps: `apps/web`, `apps/management-web` (user); `apps/api`, `apps/management-api` (developer).
  `packages/metaboost-signing` is published to npm by `publish-metaboost-signing.yml` (developer).
- Publish scripts: `scripts/publish/bump-version.sh`, `sync-develop-to-staging.sh`,
  `sync-staging-to-main.sh`. Workflows: `ci.yml`, `publish-staging.yml`, `publish-main.yml`.
- Git hooks: `scripts/git-hooks/pre-push`. Makefiles: `makefiles/local/*.mk` from the root
  `Makefile`.

## Steps

1. **Copy scripts.** `scripts/release-notes/` from podverse as-is, including tests and
   `SCRIPTS-RELEASE-NOTES.md`. Add a one-line header comment in each copied file naming podverse
   as the source, so later fixes land in podverse first and are copied over.
2. **Config.** `release-notes.config.json` with the five entries above. Watch globs: each app's
   `src/**`; `packages/ui/**` for web and management-web; `packages/metaboost-signing/src/**` for
   signing. Tag patterns match podverse.
3. **Make + npm.** Same targets and npm scripts as podverse 02, in a new
   `makefiles/release/Makefile.release-notes.mk` included from the root `Makefile`.
4. **Rules, skill, prompt.** Copy `release-notes-authoring.mdc`, `release-notes-files.mdc`, the
   `release-notes` skill, and the finalize prompt; replace podverse app names and examples with
   metaboost ones. Update metaboost's `release-notes-suggest.mdc` the same way 03 updates podverse.
   Extend metaboost's `operator-only-git-operations.mdc` like 03.
5. **Hooks.** Copy `.cursor/hooks.json` and both hook scripts; adjust the guard list to metaboost's
   publish scripts and the signing package publish. Update `.cursor/hooks/CURSOR-HOOKS.md`.
6. **Pre-push and CI.** Same pre-push addition as 03. Same `release-notes` CI job as 04.
7. **Publish scripts.** Same bump, staging-sync, and main-sync changes as 04. In `publish-main.yml`,
   replace the placeholder release body with `compose --format github`, with the same fallback.
   For the signing package, have its publish workflow use `compose --app metaboost-signing` as the
   GitHub release body when it creates one.
8. **Seed 0.1.16.** No formal tag exists, so there is no automatic base. Ask the operator for the
   base. Offer `0.1.16-staging.0` (notes for this version only) or `0.1.9-staging.0` (the oldest
   tag, so the first formal release covers everything so far). Follow 05's steps: Working
   notes per staging tag, finalize prompt, `make release_notes_check`, leave as draft.
9. **Docs.** Add the operator runbook order to `docs/development/release/` (create
   `RELEASE-NOTES.md`) and link it from the publish docs.

## Done when

- `make release_notes_check` passes in metaboost with five `0.1.16.md` drafts.
- Hooks, pre-push, CI, and publish gate behave like podverse's.
- The response lists the operator commands for metaboost in run order, and the commands to run
  the copied tests.
