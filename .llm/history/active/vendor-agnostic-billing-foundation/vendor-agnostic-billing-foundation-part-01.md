# vendor-agnostic-billing-foundation

**Started:** 2026-05-04  
**Author:** Cursor Agent  
**Context:** Cross-repo plan set for vendor-agnostic billing, renewal cadence policy, and
DB-backed product pricing governance.

---

### Session 1 - 2026-05-04

#### Prompt (Developer)

create and save the plan files locally

#### Key Decisions

- Create and save local deferred plan sets under `.llm/plans/active/` for Podverse and Metaboost.
- Keep plan content future-focused and provider-agnostic with DB-first pricing governance.
- Include phased execution files: `00-SUMMARY.md`, `00-EXECUTION-ORDER.md`, numbered plan files,
  and `COPY-PASTA.md`.

#### Files Created/Modified

- `.llm/history/active/vendor-agnostic-billing-foundation/vendor-agnostic-billing-foundation-part-01.md`

### Session 4 - 2026-05-05

#### Prompt (Developer)

@podverse/.llm/plans/active/vendor-agnostic-billing-foundation/COPY-PASTA.md:12-13

#### Key Decisions

- Added linear SQL migrations to introduce DB-backed pricing catalog tables and seeded premium monthly/annual defaults (3.00/30.00 USD), with effective-window constraints and optional audit storage.
- Added bootstrap-safe ORM pricing resolution so API and management-api resolve premium pricing from DB first and only initialize/fallback from env when rows are missing.
- Extended membership status schema/entity/DTO to include cadence, renewal attempt/status metadata, and idempotency key material.
- Added management permission surface for pricing updates (`billing_prices_crud`) and wired it into authz + table policies for billing tables.
- Marked Prompt 2 complete in plan tracking and moved `02-pricing-catalog-and-schema.md` to completed.

#### Files Created/Modified

- `.llm/history/active/vendor-agnostic-billing-foundation/vendor-agnostic-billing-foundation-part-01.md`
- `.llm/plans/active/vendor-agnostic-billing-foundation/COPY-PASTA.md`
- `.llm/plans/completed/vendor-agnostic-billing-foundation/02-pricing-catalog-and-schema.md`
- `.llm/plans/active/vendor-agnostic-billing-foundation/02-pricing-catalog-and-schema.md` (deleted)
- `infra/k8s/base/ops/source/database/linear-migrations/app/0028_billing_pricing_catalog.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/management/0005_billing_prices_permissions.sql`
- `packages/helpers/src/dtos/account/accountMembershipStatus.ts`
- `packages/orm/src/db/entities.ts`
- `packages/orm/src/entities/account/accountMembershipStatus.ts`
- `packages/orm/src/entities/billingProduct.ts`
- `packages/orm/src/entities/billingPrice.ts`
- `packages/orm/src/entities/billingPriceChangeAudit.ts`
- `packages/orm/src/index.ts`
- `packages/orm/src/services/account/accountMembershipStatus.ts`
- `packages/orm/src/services/billingPriceCatalog.ts`
- `apps/api/src/controllers/membership.ts`
- `apps/management-api/src/@types/express.d.ts`
- `apps/management-api/src/lib/auth/index.ts`
- `apps/management-api/src/lib/authz/requireCrud.ts`
- `apps/management-api/src/lib/authz/requireCrud.test.ts`
- `apps/management-api/src/lib/database/tablePolicy.ts`
- `apps/management-api/src/lib/database/tablePolicy.test.ts`
- `apps/management-api/src/orm/entities/adminAccountPermissions.ts`
- `apps/management-api/src/orm/services/adminAccount.ts`
- `apps/management-api/src/routes/adminAccount.integration.test.ts`
- `apps/management-api/src/routes/admins.integration.test.ts`
- `apps/management-api/src/routes/admins.ts`
- `apps/management-api/src/routes/auth.integration.test.ts`
- `apps/management-api/src/routes/database.integration.test.ts`
- `apps/management-api/src/routes/database.ts`
- `apps/management-api/src/routes/feedFlagStatus.integration.test.ts`
- `apps/management-api/src/routes/product/membershipDefaults.ts`
- `apps/management-api/src/routes/productMembershipDefaults.integration.test.ts`
- `apps/management-api/src/routes/stats.integration.test.ts`
- `apps/management-api/src/routes/users.integration.test.ts`
- `apps/management-web/src/lib/requests/auth.ts`

### Session 7 - 2026-05-05

#### Prompt (Developer)

@podverse/apps/management-web/src/app/(management)/products/memberships/ProductMembershipsPageClient.tsx:1-122 there are strings in here that should be i18n translated

#### Key Decisions

- Added `productMemberships.pricingTable` nested keys (`heading`, `cadence`, `amountCents`, `currency`, `effectiveFrom`, `source`) to `en-US`, `es`, `fr`, and `el-GR` originals plus matching empty override stubs for non-source locales.
- Replaced the section heading and table header literals in `ProductMembershipsPageClient` with `t('pricingTable.*')` under the existing `productMemberships` namespace.

#### Files Created/Modified

- `.llm/history/active/vendor-agnostic-billing-foundation/vendor-agnostic-billing-foundation-part-01.md`
- `apps/management-web/i18n/originals/en-US.json`
- `apps/management-web/i18n/originals/es.json`
- `apps/management-web/i18n/originals/fr.json`
- `apps/management-web/i18n/originals/el-GR.json`
- `apps/management-web/i18n/overrides/es.json`
- `apps/management-web/i18n/overrides/fr.json`
- `apps/management-web/i18n/overrides/el-GR.json`
- `apps/management-web/src/app/(management)/products/memberships/ProductMembershipsPageClient.tsx`

### Session 6 - 2026-05-05

#### Prompt (Developer)

Use Canonical BillingCadence Type

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Replaced eight remaining inline `'monthly' | 'annual'` unions across api, management-api, management-web, helpers, and orm with the canonical `BillingCadence` type from `@podverse/helpers` (imported on a separate `import type` line per repo rule).
- Removed the local `type BillingCadence = 'monthly' | 'annual';` declaration in `packages/orm/src/services/billingPriceCatalog.ts` so the canonical helpers export is the single source of truth.
- Verified with `npm run build` for `packages/helpers`, `packages/orm`, `apps/management-api`, and `apps/api`; ran `eslint --fix` on import order in `billingPriceCatalog.ts` and `external-services-and-meta.test.ts`.
- Pre-existing TypeScript errors in `apps/api/src/test/external-services-and-meta.test.ts` (incomplete `getAccountMock.mockResolvedValueOnce` partial mocks introduced in Session 5) are unrelated to this plan and out of scope.

#### Files Created/Modified

- `.llm/history/active/vendor-agnostic-billing-foundation/vendor-agnostic-billing-foundation-part-01.md`
- `apps/management-api/src/routes/product/pricing.ts`
- `apps/management-web/src/lib/requests/productPricing.ts`
- `apps/api/src/test/external-services-and-meta.test.ts`
- `packages/helpers/src/dtos/account/accountMembershipStatus.ts`
- `packages/orm/src/entities/account/accountMembershipStatus.ts`
- `packages/orm/src/services/account/accountMembershipStatus.ts`
- `packages/orm/src/entities/billingPrice.ts`
- `packages/orm/src/services/billingPriceCatalog.ts`

### Session 5 - 2026-05-05

#### Prompt (Developer)

@podverse/.llm/plans/active/vendor-agnostic-billing-foundation/COPY-PASTA.md:17-18

#### Key Decisions

- Added normalized billing domain events with a dedicated persistence table and orchestration services for payment-settled, renewal success/failure, and pay-on-demand extension workflows.
- Implemented idempotent membership extension services that always delegate date math to `membershipPeriodPolicy`.
- Added management-api pricing governance endpoints (`active`, `schedule`, `activate`, `deprecate`) with `billing_prices` CRUD enforcement and audit log recording.
- Added workers renewal orchestration command and cron wiring to process due renewals through a provider-agnostic adapter boundary while persisting retry metadata.
- Exposed a client-safe billing read model endpoint for authenticated membership visibility and pricing data.
- Completed Prompt 3 and archived the remaining active plan-set files into the completed plan directory.

#### Files Created/Modified

- `.llm/history/active/vendor-agnostic-billing-foundation/vendor-agnostic-billing-foundation-part-01.md`
- `.llm/plans/completed/vendor-agnostic-billing-foundation/00-EXECUTION-ORDER.md`
- `.llm/plans/completed/vendor-agnostic-billing-foundation/00-SUMMARY.md`
- `.llm/plans/completed/vendor-agnostic-billing-foundation/03-services-api-and-orchestration.md`
- `.llm/plans/completed/vendor-agnostic-billing-foundation/COPY-PASTA.md`
- `.llm/plans/active/vendor-agnostic-billing-foundation/00-EXECUTION-ORDER.md` (deleted)
- `.llm/plans/active/vendor-agnostic-billing-foundation/00-SUMMARY.md` (deleted)
- `.llm/plans/active/vendor-agnostic-billing-foundation/03-services-api-and-orchestration.md` (deleted)
- `.llm/plans/active/vendor-agnostic-billing-foundation/COPY-PASTA.md` (deleted)
- `infra/k8s/base/ops/source/database/linear-migrations/app/0029_billing_events_and_retry_metadata.sql`
- `infra/k8s/base/cron/worker-billing-renewals.cronjob.yaml`
- `infra/k8s/base/cron/kustomization.yaml`
- `packages/helpers/src/lib/billingEvents.ts`
- `packages/helpers/src/index.ts`
- `packages/helpers/src/dtos/account/accountMembershipStatus.ts`
- `packages/orm/src/entities/billingDomainEvent.ts`
- `packages/orm/src/entities/account/accountMembershipStatus.ts`
- `packages/orm/src/services/billingDomainEventLog.ts`
- `packages/orm/src/services/billingMembershipExtension.ts`
- `packages/orm/src/services/billingRenewalOrchestrator.ts`
- `packages/orm/src/services/account/accountMembershipStatus.ts`
- `packages/orm/src/services/account/accountPayPalOrder.ts`
- `packages/orm/src/services/membershipClaimToken.ts`
- `packages/orm/src/db/entities.ts`
- `packages/orm/src/index.ts`
- `apps/workers/src/commands/billing/processDueRenewals.ts`
- `apps/workers/src/commands/index.ts`
- `apps/workers/src/lib/startup/categoriesForCommand.ts`
- `apps/workers/src/lib/startup/validation.ts`
- `apps/workers/package.json`
- `packages/worker-commands/src/registry.ts`
- `packages/worker-commands/src/types.ts`
- `apps/management-api/src/routes/product/pricing.ts`
- `apps/management-api/src/routes/product/index.ts`
- `apps/management-api/src/routes/productPricing.integration.test.ts`
- `apps/api/src/controllers/membership.ts`
- `apps/api/src/routes/product/membership.ts`
- `apps/api/src/test/external-services-and-meta.test.ts`
- `apps/management-web/src/lib/requests/productPricing.ts`
- `apps/management-web/src/app/(management)/products/memberships/ProductMembershipsPageClient.tsx`
- `apps/management-web/e2e/products-hub.spec.ts`

### Session 3 - 2026-05-05

#### Prompt (Developer)

@podverse/.llm/plans/active/vendor-agnostic-billing-foundation/COPY-PASTA.md:12-13

#### Key Decisions

- In progress.

#### Files Created/Modified

- `.llm/history/active/vendor-agnostic-billing-foundation/vendor-agnostic-billing-foundation-part-01.md`
- `packages/helpers/src/lib/billingDomain.ts`
- `packages/helpers/src/lib/membershipPeriodPolicy.ts`
- `packages/helpers/src/lib/membershipPeriodPolicy.test.ts`
- `packages/helpers/src/lib/premiumBillingCadence.ts`
- `packages/helpers/src/index.ts`
- `packages/orm/src/services/membershipClaimToken.helpers.ts`
- `packages/orm/src/services/membershipClaimToken.helpers.test.ts`
- `packages/orm/src/services/account/accountPayPalOrder.ts`
- `packages/orm/src/services/account/account.ts`
- `apps/management-api/src/routes/users.ts`
- `apps/management-web/src/lib/createUserFormDefaults.ts`
- `.llm/plans/active/vendor-agnostic-billing-foundation/COPY-PASTA.md`
- `.llm/plans/completed/vendor-agnostic-billing-foundation/01-domain-and-period-policy.md`
- `.llm/plans/active/vendor-agnostic-billing-foundation/01-domain-and-period-policy.md` (deleted)
- `.llm/plans/active/vendor-agnostic-billing-foundation/00-SUMMARY.md`
- `.llm/plans/active/vendor-agnostic-billing-foundation/00-EXECUTION-ORDER.md`
- `.llm/plans/active/vendor-agnostic-billing-foundation/01-domain-and-period-policy.md`
- `.llm/plans/active/vendor-agnostic-billing-foundation/02-pricing-catalog-and-schema.md`
- `.llm/plans/active/vendor-agnostic-billing-foundation/03-services-api-and-orchestration.md`
- `.llm/plans/active/vendor-agnostic-billing-foundation/COPY-PASTA.md`

### Session 2 - 2026-05-05

#### Prompt (Developer)

@podverse/.llm/plans/active/vendor-agnostic-billing-foundation/COPY-PASTA.md:7-8

#### Key Decisions

- Execute plan step `01-domain-and-period-policy.md` exactly as written.
- Introduce shared vendor-agnostic billing domain types and a centralized period policy helper.
- Migrate membership extension call sites to the shared helper and add deterministic boundary tests.

#### Files Created/Modified

- `.llm/history/active/vendor-agnostic-billing-foundation/vendor-agnostic-billing-foundation-part-01.md`

### Session 3 - 2026-05-06

#### Prompt (Developer)

we also don't want any references to "legacy" after this plan is finished. implement the plan

#### Key Decisions

- Introduced `ResolvedProductMembership` in `@podverse/helpers`; kept `ProductMembershipDefaultsFromEnv` / `resolveProductMembershipDefaultsFromEnv` for env bootstrap only.
- Renamed `BillingPriceCatalogService` methods to `resolveProductMembership`, `updateProductMembershipTrial`, and trial seed helpers; singleton table renamed to `product_membership_settings` with migration file `0030_product_membership_settings.sql`.
- Management API routes/schemas/requests: `productMembershipRouter`, `updateProductMembershipTrialBodySchema`, `getResolvedProductMembership` / `updateProductMembershipTrial`; audit log uses `product_membership_settings`.
- Main API: `MembershipController.getResolvedProductMembership`; removed misleading “legacy” wording from `premiumBillingCadence.ts`.
- Management-web i18n and UI copy updated away from “defaults” where it described resolved DB/env merge; K8s ConfigMap env file renamed to `product-membership-settings.env`.
- Regenerated linear baseline gz archives after DDL rename.
- Added missing `entityTypeLabel` / `rangeLabel` helpers in `StatsPageClient.tsx` so `next build` succeeds (undefined symbols).

#### Files Created/Modified

- `packages/helpers/src/lib/productMembershipDefaultsFromEnv.ts`, `packages/helpers/src/index.ts`, `packages/helpers/src/lib/premiumBillingCadence.ts`
- `packages/orm/src/services/billingPriceCatalog.ts`, `packages/orm/src/entities/productMembershipSettings.ts`, `packages/orm/src/db/entities.ts`, `packages/orm/src/index.ts`, `packages/orm/src/services/account/account.ts`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0030_product_membership_settings.sql` (replaces `0030_product_membership_defaults.sql`)
- `infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz`, `infra/k8s/base/db/source/bootstrap/0003b_management_linear_baseline.sql.gz`
- `infra/k8s/base/api/source/api.env`, `infra/k8s/base/product-membership/kustomization.yaml`, `infra/k8s/base/product-membership/source/product-membership-settings.env`
- `apps/api/src/controllers/membership.ts`, `apps/api/src/routes/product/membership.ts`, `apps/api/.env.example`, `apps/api/ENV.md`
- `apps/management-api/src/routes/product/productMembership.ts`, `apps/management-api/src/routes/product/index.ts`, `apps/management-api/src/schemas/productMembership.ts`, `apps/management-api/src/routes/productMembership.integration.test.ts`, `apps/management-api/src/routes/users.ts`, `apps/management-api/src/routes/users.integration.test.ts`, `apps/management-api/.env.example`, `apps/management-api/ENV.md`
- `apps/management-web/src/lib/requests/productMembership.ts`, `apps/management-web/src/lib/createUserFormDefaults.ts`, `apps/management-web/src/app/(management)/products/memberships/ProductMembershipsPageClient.tsx`, `apps/management-web/src/app/(management)/users/new/NewUserPageClient.tsx`, `apps/management-web/e2e/products-hub.spec.ts`, `apps/management-web/i18n/originals/en-US.json`, `apps/management-web/i18n/originals/es.json`, `apps/management-web/i18n/originals/fr.json`, `apps/management-web/i18n/originals/el-GR.json`, `apps/management-web/i18n/overrides/es.json`, `apps/management-web/i18n/overrides/fr.json`, `apps/management-web/i18n/overrides/el-GR.json`
- `apps/management-web/src/app/(management)/stats/StatsPageClient.tsx`
- `.cursor/rules/env-expiration-naming.mdc`
- `.llm/history/active/vendor-agnostic-billing-foundation/vendor-agnostic-billing-foundation-part-01.md`

### Session 4 - 2026-05-06

#### Prompt (Developer)

@podverse/packages/helpers/src/lib/productMembershipDefaultsFromEnv.ts:6-28 it seems like these functions are more generic than "product membership defaults from env"

can you move them to a more appropriate more generic file?

#### Key Decisions

- Added `packages/helpers/src/lib/parseEnvNonNegative.ts` exporting `parseNonNegativeNumberEnv` and `parseNonNegativeIntEnv`; `productMembershipDefaultsFromEnv.ts` imports from there.
- Re-exported from `packages/helpers` barrel (`index.ts`).

#### Files Created/Modified

- `packages/helpers/src/lib/parseEnvNonNegative.ts`
- `packages/helpers/src/lib/productMembershipDefaultsFromEnv.ts`
- `packages/helpers/src/index.ts`
- `.llm/history/active/vendor-agnostic-billing-foundation/vendor-agnostic-billing-foundation-part-01.md`
