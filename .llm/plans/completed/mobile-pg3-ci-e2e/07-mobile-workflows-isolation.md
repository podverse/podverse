# Plan 07 — Mobile workflows + server CI isolation

**Steps:** 4.4, 4.5, 4.6, 4.7
**Model:** Opus 4.8

## Detail references

- [153-workflow-mobile-internal](/docs/proposals/mobile/_master-plan_/details/153-workflow-mobile-internal.md)
- [154-workflow-mobile-staging-beta](/docs/proposals/mobile/_master-plan_/details/154-workflow-mobile-staging-beta.md)
- [155-workflow-mobile-production](/docs/proposals/mobile/_master-plan_/details/155-workflow-mobile-production.md)
- [156-ci-isolation-from-server](/docs/proposals/mobile/_master-plan_/details/156-ci-isolation-from-server.md)

## Tasks

1. Add `mobile-internal.yml`, `mobile-staging-beta.yml`, `mobile-production-submit.yml`.
2. Production workflow requires manual approval; `.next` only.
3. Prove/document isolation from `publish-staging.yml` / `publish-main.yml`.

## On completion

Mark steps **4.4, 4.5, 4.6, 4.7** `done`.
