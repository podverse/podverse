# 09 — Beta Environment

## Goal

Run a full standalone v5 beta (API, web, workers, mobile) whose database is
later **promoted to production**, so beta tester data survives launch.

## Status

Draft. Needs operator review. k8s today has **alpha**; beta/prod overlays are
future work per [INFRA-K8S.md](/infra/k8s/INFRA-K8S.md).

## What we know

- Operator intent: beta sits between current alpha and production. Beta DB
  becomes prod. Legacy (v4) data is migrated gradually as users log into the
  new app after prod cutover — and earlier for beta testers who opt in.
- Mobile already has EAS profiles that point beta/preview builds at non-prod
  APIs; production store identity is still isolated as
  `com.podverse.app.next` until [03](03-store-identity-and-signing.md).
- Installing a beta build under the **v4 store ids** replaces the production v4
  app on that device. Testers cannot casually go back without reinstalling v4
  from the store (and may lose local state).

## Proposed approach

1. Create a **beta** k8s environment and empty-or-seeded standalone database
   (not a clone of alpha unless that is intentional).
2. Invite testers who accept: "this build replaces your v4 app; after you
   migrate, treat v4 as unavailable on this device."
3. On first beta login, run the same lazy migration pipeline as prod
   ([07](07-account-and-data-migration-model.md)), reading from the live v4 DB
   (or a refreshed copy) into the **beta** DB.
4. Keep alpha on `.next` for ongoing development. Beta mobile uses v4 ids so
   local-data migration is real.
5. At launch, **promote** the beta database and cluster config to prod (exact
   mechanism TBD: rename, restore, or DNS flip onto the same data). Avoid a
   second full user migration from beta → prod.
6. After promotion, new production logins continue lazy migration from v4 for
   everyone who was not a beta tester.

## Honest limits and risks

- Promoting beta to prod means beta mistakes become prod data. Need backup and
  a freeze window before promotion.
- Reading live v4 from beta migrators must be rate-limited and credentialed.
- If beta is under-used, promotion still works, but load testing of migration
  will be weak — lean on [06](06-database-migration-rehearsal.md).
- Web and API hostnames for beta must not steal `podverse.fm` until cutover
  ([11](11-web-api-and-url-cutover.md)).

## Open questions

- Hostname scheme for beta (API and web)?
- Promote by promoting the DB in place, or by dump/restore into a new prod
  cluster?
- How many beta testers are enough before store submission?
- Should beta membership purchases be sandbox-only?

## Future plan sets

- `infra/k8s/beta` overlay and GitOps app.
- Beta mobile EAS profile under v4 ids.
- Promotion runbook (operator-only; no secrets in git).
