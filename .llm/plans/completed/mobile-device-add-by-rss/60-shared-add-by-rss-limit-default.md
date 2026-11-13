**Cursor model:** Opus 5.5 · **Reasoning:** high

# 60 — One shared Add by RSS limit for Trial and Premium

Trial and Premium get the same Add by RSS limit. Today they are two settings: env keys
`MEMBERSHIP_TRIAL_MAX_ADD_BY_RSS_FEEDS` (10) and `MEMBERSHIP_PREMIUM_MAX_ADD_BY_RSS_FEEDS`
(100), two columns on `product_membership_settings`, two fields on `ResolvedProductMembership`,
and two hardcoded defaults in `accountTrust.ts`. They become one: env key
`MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS`, default **100**, read in code as `maxAddByRSSFeeds`, one
column `max_add_by_rss_feeds`. A per-account override (`max_add_by_rss_feeds` on account
membership status) still wins over the default.

The Trial limitations list stops mentioning Add by RSS. The sentence
`membership.trial_limitations_add_by_rss_feed_limit` ("Add by RSS holds up to 10 feeds on Trial
and 100 on Premium.") and its catalog key are removed, with every caller that builds or passes
it. The limit is no longer a Trial limitation. On mobile, plan 64 states it as help text on the
Add by RSS screen instead.

This plan does not touch the at-limit refusal body (plan 63), the readers the device uses
(plan 62), the mobile help text (plan 64), or the management screens and management API body
(plan 61).

## Rows

R28, R29, R50

R29 needs no implementation. The deferred plan `.llm/plans/active/account-add-by-rss-cap-500.md`
already describes one shared limit and one refusal. Do not edit that file.

## Runs after

none

## Files

packages/helpers/src/lib/accountTrust.ts
packages/helpers/src/lib/accountTrust.test.ts
packages/helpers/src/lib/productMembershipDefaultsFromEnv.ts
packages/helpers/src/lib/membershipFeatureComparison.ts
packages/helpers/src/lib/membershipFeatureComparison.test.ts
packages/orm/src/entities/productMembershipSettings.ts
packages/orm/src/services/billingPriceCatalog.ts
packages/orm/src/services/billingPriceCatalog.update.test.ts
infra/k8s/base/ops/source/database/linear-migrations/app/0009_product_membership_shared_add_by_rss_limit.sql (new)
infra/k8s/base/ops/kustomization.yaml
infra/k8s/base/api/source/api.env
infra/k8s/base/db/source/bootstrap/0004_app_linear_baseline.sql.gz (regenerated)
infra/k8s/base/db/source/bootstrap/0005_management_linear_baseline.sql.gz (regenerated)
infra/k8s/base/product-membership/source/product-membership-settings.env
apps/api/.env.example
apps/api/src/lib/startup/validation.ts
apps/api/src/lib/accountEntitlements.ts
apps/api/src/controllers/membership.ts
apps/api/src/lib/membership/membershipComparisonCatalog.ts
apps/api/openapi.yml
apps/api/src/test/external-services-and-meta.test.ts
apps/api/src/test/account-notifications.test.ts
apps/management-api/.env.example
apps/management-api/src/lib/startup/validation.ts
apps/web/src/app/membership/useMembershipComparison.ts
apps/web/e2e/membership-page-trial-limitations.spec.ts
apps/mobile/src/components/membership/useMembershipComparisonDocument.ts
packages/i18n-catalog/consumer/originals/en-US.json
packages/i18n-catalog/consumer/originals/es.json
packages/i18n-catalog/consumer/originals/fr.json
packages/i18n-catalog/consumer/originals/el-GR.json
packages/i18n-catalog/consumer/overrides/*.json (by `npm run i18n:compile` only)
release-notes/scratchpad.md

## Decisions already made (transcribe, do not revisit)

- One default, `MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS`, value 100, field `maxAddByRSSFeeds`, column
  `max_add_by_rss_feeds`. The two old env keys, fields, and columns are removed, not kept as
  aliases. Grep for `trialMaxAddByRSSFeeds`, `premiumMaxAddByRSSFeeds`,
  `TRIAL_MAX_ADD_BY_RSS`, `PREMIUM_MAX_ADD_BY_RSS`, `trial_max_add_by_rss`, and
  `premium_max_add_by_rss` when done. The only remaining hits may be the management files plan
  61 owns, `accountFollowingAddByRSSChannel.ts` (plan 63 owns its refusal body), the generated
  baselines, and `0001_app_schema.sql`.
- The migration copies the stored Premium value into the new column. A database that kept the
  shipped defaults ends at 100. The Trial column is dropped without being read.
- The manual-refresh caps stay per tier. Only the Add by RSS limit is shared.
- The Trial limitations list has no Add by RSS sentence. The key
  `membership.trial_limitations_add_by_rss_feed_limit`, the `trialFeedLimit` message, and every
  caller that fills it are removed. Nothing is rewritten and no `{max_feeds}` placeholder is
  passed anywhere in the comparison.
- `ProductMembershipCapDefaults` and `ProductMembershipEntitlementDefaults` carry
  `maxAddByRSSFeeds` in place of the two fields. `MembershipComparisonCaps` loses both Add by RSS
  fields and gains none. Field names elsewhere in those types do not change.
- When done, `rg trial_limitations_add_by_rss_feed_limit` and `rg trialFeedLimit` return nothing
  outside `.llm/` and `release-notes/`.

## Intentional divergence between surfaces

After this plan, neither the web membership page, the mobile membership screen, nor the API
comparison document (`GET /product/membership/comparison`) states the Add by RSS limit. Mobile
states the signed-in account's own limit as help text on the Add by RSS library screen (plan 64).
Web's Add by RSS pages state no limit; a web user learns the number from the at-limit refusal
(plan 63). This is intended: the limit is per account (a management override can change it), so
a page that shows the same text to every reader is the wrong place for it. Do not add a web
counterpart.

## 1. Helpers

- `packages/helpers/src/lib/accountTrust.ts`: export
  `DEFAULT_MAX_ADD_BY_RSS_FEEDS = 100` and use it for `maxAddByRSSFeeds` in both
  `DEFAULT_UNTRUSTED_ACCOUNT_ENTITLEMENTS` and `DEFAULT_TRUSTED_ACCOUNT_ENTITLEMENTS`.
  `resolveAccountEntitlements` keeps `overrides?.max_add_by_rss_feeds ?? defaults.maxAddByRSSFeeds`.
  Add a case to `accountTrust.test.ts`: an untrusted and a trusted tier with no overrides both
  resolve `maxAddByRSSFeeds` to 100, and an override of 7 wins on either tier.
- `packages/helpers/src/lib/productMembershipDefaultsFromEnv.ts`: in
  `ProductMembershipDefaultsFromEnv`, `ResolvedProductMembership`, and the
  `ProductMembershipEntitlementDefaults` `Pick`, replace the two fields with
  `maxAddByRSSFeeds: number`. `resolveProductMembershipDefaultsFromEnv()` reads
  `parseNonNegativeIntEnv('MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS', DEFAULT_MAX_ADD_BY_RSS_FEEDS)`.
- `packages/helpers/src/lib/membershipFeatureComparison.ts`:
  - Remove `trialMaxAddByRSSFeeds` and `premiumMaxAddByRSSFeeds` from `MembershipComparisonCaps`.
    Add no replacement field.
  - Remove `trialFeedLimit` from `MembershipComparisonMessages`, and update its doc comment so it
    no longer names `{trial_feeds}` (the refresh placeholders remain).
  - In `buildMembershipComparisonDocument`, delete the
    `caps.trialMaxAddByRSSFeeds < caps.premiumMaxAddByRSSFeeds` branch and its push. The other
    Trial sentences keep their order.
  - Plan 50 edits the `add_rss` row in this same file; leave that row as you find it.

## 2. Database and ORM

New file `infra/k8s/base/ops/source/database/linear-migrations/app/0009_product_membership_shared_add_by_rss_limit.sql`.
If `0009_` is taken when you start, use the next free number and use that filename everywhere
below. Greenfield-only (**linear-sql-greenfield-only**): no `IF EXISTS`. In order:

1. Add `max_add_by_rss_feeds integer` to `public.product_membership_settings`.
2. Set it from `premium_max_add_by_rss_feeds`.
3. Set default 100, `NOT NULL`, and a check constraint
   `product_membership_settings_max_add_by_rss_feeds_check` (`>= 0`), matching how
   `0001_app_schema.sql` declares the old pair (search
   `product_membership_settings_premium_max_add_by_rss_feeds_check`).
4. Drop `trial_max_add_by_rss_feeds` and `premium_max_add_by_rss_feeds`. Their constraints go
   with the columns.

Then (**migration-readiness-marker-sync**):

- `API_EXPECTED_MIGRATION_FILENAME` in `infra/k8s/base/api/source/api.env` and in the
  `podverse-ops-migration-scripts` literals of `infra/k8s/base/ops/kustomization.yaml`.
- Add the file under `podverse-ops-app-linear-migrations` `files` in that kustomization, after
  `0008_legacy_pending_row.sql`.
- Run `make db_regen_linear_baseline` and `make db_verify_linear_baseline` yourself (the skill
  says agents run these) and leave both regenerated `.sql.gz` files in the tree.
  `MANAGEMENT_API_EXPECTED_MIGRATION_FILENAME` does not change.

ORM:

- `packages/orm/src/entities/productMembershipSettings.ts`: one column `max_add_by_rss_feeds`
  in place of the two.
- `packages/orm/src/services/billingPriceCatalog.ts`: `ProductMembershipSettingsRow`, the seed
  INSERT in `ensureProductMembershipTrialSeededFromEnv` (including its `NODE_ENV === 'test'`
  `DO UPDATE` list), `updateProductMembershipSettings` (param `maxAddByRSSFeeds?: number`, column
  `max_add_by_rss_feeds`), `resolveProductMembershipCapDefaults`, and `resolveProductMembership`
  all move to the one field.
- `billingPriceCatalog.update.test.ts`: the case "runs UPDATE with cap column when changing trial
  RSS cap" becomes "runs UPDATE with the shared Add by RSS column", calling
  `updateProductMembershipSettings({ maxAddByRSSFeeds: 7 })` and expecting
  `max_add_by_rss_feeds = $1`.

After this section the management API (`apps/management-api/src/routes/product/productMembership.ts`)
no longer type-checks against the ORM service. Plan 61 fixes it. Do not edit management files
here.

## 3. Env, k8s, and startup validation

- `apps/api/.env.example`: in the "Membership-tier capability defaults" block, replace the two
  lines with `MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS="100"`, first in the block, and change the block
  comment to say the Add by RSS limit is shared by Trial and Premium while the other keys are per
  tier.
- `apps/management-api/.env.example`: add `MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS="100"` after
  `MEMBERSHIP_FREE_TRIAL_EXPIRATION`.
- `infra/k8s/base/product-membership/source/product-membership-settings.env`: replace the two
  lines with `MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS=100` (unquoted, **env-file-formatting**).
- `apps/api/src/lib/startup/validation.ts`, under `// Premium/Membership`:
  `results.push(validateOptional('MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS', 'Premium', 'Use Default (100)'));`
  after `MEMBERSHIP_FREE_TRIAL_EXPIRATION`.
- `apps/management-api/src/lib/startup/validation.ts`: after the
  `MEMBERSHIP_FREE_TRIAL_EXPIRATION` entry, a `validateOptional(env, 'MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS', 'Membership', 'Blank uses default (100); Trial and Premium share it')`.

## 4. API

- `apps/api/src/lib/accountEntitlements.ts`: both tiers in `getAccountEntitlements` take
  `maxAddByRSSFeeds: capDefaults.maxAddByRSSFeeds`; `getMembershipDefaults` picks the one field.
- `apps/api/src/controllers/membership.ts` `getComparison`: delete the `premiumMaxAddByRSSFeeds`
  and `trialMaxAddByRSSFeeds` lines from the caps and add nothing. `getResolvedProductMembership`
  needs no edit; its spread now carries `maxAddByRSSFeeds` (plan 62 documents it).
- `apps/api/src/lib/membership/membershipComparisonCatalog.ts`: delete the `trialFeedLimit` entry
  (the `message(original, override, ['membership', 'trial_limitations_add_by_rss_feed_limit'])`
  call).
- `apps/api/openapi.yml`, the example under `/product/membership/comparison`
  (`operationId: apiGetProductMembershipComparison`): delete the item line
  `- Add by RSS holds up to 10 feeds on Trial and 100 on Premium.` Plans 62 and 63 edit other
  sections of this file later.
- `apps/api/src/test/external-services-and-meta.test.ts`, `describe('Product membership defaults'`:
  replace the two matchers with `maxAddByRSSFeeds: expect.any(Number)`. Plan 50 edits the
  `describe('Membership comparison'` block of this file; leave that block's `add_rss` assertions as
  you find them.
- `apps/api/src/test/account-notifications.test.ts`: the
  `resolveProductMembershipCapDefaultsMock` returns `maxAddByRSSFeeds: 1000` in place of the two.

## 5. Comparison copy and callers

Delete `membership.trial_limitations_add_by_rss_feed_limit` from the four consumer originals
(`en-US`, `es`, `fr`, `el-GR`). Then run `npm run i18n:compile`, which drops the key's slot from
every consumer override file. Never hand-edit `overrides/`.

Callers:

- `apps/web/src/app/membership/useMembershipComparison.ts`: delete the `trialFeedLimit` entry
  from the messages and the `premiumMaxAddByRSSFeeds` and `trialMaxAddByRSSFeeds` lines from the
  caps.
- `apps/mobile/src/components/membership/useMembershipComparisonDocument.ts`: the same deletions.
- The API loader and controller are in § 4.

## Tests

- `packages/helpers/src/lib/membershipFeatureComparison.test.ts`: remove `trialFeedLimit` from
  the messages fixture and the two Add by RSS fields from the caps in both cases. The first case
  expects `['Directory blocked.', 'Refresh 5 and 20.', 'Listens are saved.']`. The second case
  ("drops a Trial sentence when Trial and Premium allow the same cap") keeps its name and still
  expects `['Listens are saved.']`.
- `accountTrust.test.ts` and `billingPriceCatalog.update.test.ts` as in § 1 and § 2.
- `external-services-and-meta.test.ts` and `account-notifications.test.ts` as in § 4.
- `apps/web/e2e/membership-page-trial-limitations.spec.ts`: delete the `feedLimitBullet` const and
  its two assertions (the `not.toBeVisible` one and the `toBeVisible` one). Nothing else in that
  spec changes. `about-page-features.spec.ts` does not assert this sentence and needs no edit.
- No Maestro flow. No mobile flow asserts the removed sentence.

## Release scratchpad

```markdown
## Trial and Premium share one Add by RSS limit

- Surfaces: api, management-api, web, mobile, k8s base env, database migration
- Change: Trial and Premium accounts now have the same Add by RSS limit, 100 feeds by default. The env keys `MEMBERSHIP_TRIAL_MAX_ADD_BY_RSS_FEEDS` and `MEMBERSHIP_PREMIUM_MAX_ADD_BY_RSS_FEEDS` are replaced by one key, `MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS` (default 100). App migration `0009_product_membership_shared_add_by_rss_limit.sql` replaces the two `product_membership_settings` columns with `max_add_by_rss_feeds`, copied from the Premium value. Per-account overrides still apply. The `GET /product/membership` response carries `maxAddByRSSFeeds` in place of `trialMaxAddByRSSFeeds` and `premiumMaxAddByRSSFeeds`. The Trial limitations list on the web membership page, the mobile membership screen, and the `GET /product/membership/comparison` document no longer has an Add by RSS line, and the catalog key `membership.trial_limitations_add_by_rss_feed_limit` is removed.
- Who notices: Trial accounts can save up to 100 Add by RSS feeds instead of 10; readers of the Trial limitations list see one line fewer; API clients reading the old fields
- Operator steps: replace the two old env keys with `MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS` in any GitOps overlay or home override that sets them; the migration runs with the deploy
```
