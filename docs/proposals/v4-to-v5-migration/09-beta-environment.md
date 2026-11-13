# 09 — Beta Environment

## Goal

After v5 is in production, beta is pre-release client testing against that
production database. Beta and production share one set of rows.

## Status

Draft. Needs operator review. k8s today has **alpha**; beta/prod overlays are
future work per [INFRA-K8S.md](/infra/k8s/INFRA-K8S.md).

## What we know

- Operator intent: after v5 is in production, beta and production use the
  production database. Beta is pre-release client testing against that data.
  There is no second database to promote or restore. Legacy (v4) data is
  migrated gradually as users log into the new app after prod cutover — and
  earlier for beta testers who opt in.
- Mobile already has EAS profiles that point beta/preview builds at non-prod
  APIs; production store identity is still isolated as
  `com.podverse.app.next` until [03](03-store-identity-and-signing.md).
- Installing a beta build under the **v4 store ids** replaces the production v4
  app on that device. Testers cannot casually go back without reinstalling v4
  from the store (and may lose local state).

## Proposed approach

1. One database. Before launch, testers use the database that will be
   production. It is not copied into a second cluster.
2. Invite testers who accept: "this build replaces your v4 app; after you
   migrate, treat v4 as unavailable on this device."
3. On first beta login, run the same pipeline as prod
   ([07](07-account-and-data-migration-model.md)). A v5 worker reads that
   tester's v4 rows at that moment, over a read-only connection, into that
   database. The v4 app does not run the copy.
4. Alpha is internal testing, before beta. Sandbox purchases are tested there
   only. Beta is public pre-release testing. Beta mobile uses v4 ids so
   local-data migration is real. A beta build does not offer a purchase. The
   person buys on the website at `podverse.fm`, or writes to
   `contact@podverse.fm`.
5. At launch, that database becomes the production database. Beta clients
   keep using it. There is no dump into a new cluster and no second copy of
   the accounts.
6. After launch, new production logins continue lazy migration from v4 for
   everyone who was not a beta tester. Later beta builds read and write the
   same production rows.

## Honest limits and risks

- A beta client writes production rows. A bad beta build can change a live
  account. There is no separate beta database to discard. It cannot start a
  purchase. Buying stays on the website or with support.
- Reading live v4 from beta migrators must be rate-limited and credentialed.
- A quiet beta leaves migration timing unproven. Lean on the rehearsal in
  [06](06-database-migration-rehearsal.md).
- Web and API hostnames for beta must not steal `podverse.fm` until cutover
  ([11](11-web-api-and-url-cutover.md)).

## Hostnames

Alpha in `k.podcastdj.com` routes four hosts. The public API puts the
environment after `api-`. Management puts the environment after the first
dot. Beta uses the same shape on `podverse.fm`.

| Role           | Alpha                                | Beta                              |
| -------------- | ------------------------------------ | --------------------------------- |
| Web            | `alpha.podcastdj.com`                | `beta.podverse.fm`                |
| API            | `api-alpha.podcastdj.com`            | `api-beta.podverse.fm`            |
| Management web | `management.alpha.podcastdj.com`     | `management.beta.podverse.fm`     |
| Management API | `management-api.alpha.podcastdj.com` | `management-api.beta.podverse.fm` |

Alpha CORS also lists `api.alpha.podcastdj.com`. That name is not on the
ingress. Beta does not add `api.beta.podverse.fm`.

Alpha sets `COOKIE_DOMAIN=.podcastdj.com`, which covers every host on that
zone. Podverse does not do that. `.podverse.fm` would send beta cookies to
the live site. `beta.podverse.fm` cannot be the cookie domain either: the
API is `api-beta.podverse.fm`, a sibling, and a response from that host
cannot set a cookie for `beta.podverse.fm`.

The public API cookie domain is `api-beta.podverse.fm`. The management API
cookie domain is `management-api.beta.podverse.fm`. Each cookie stays on the
host that set it. The beta site and the live site do not share a session.

Store submission does not wait for a tester count. The operators decide when
the beta has been exercised enough.

## Future plan sets

- `infra/k8s/beta` overlay and GitOps app.
- Beta mobile EAS profile under v4 ids, with store checkout absent. The
  screen points to `podverse.fm` and `contact@podverse.fm`.
- Point later beta builds at the production database (operator-only; no
  secrets in git).
