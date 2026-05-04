# trust-tier-hard-break

### Session 1 - 2026-05-04

#### Prompt (Developer)

Coordinated Hard-Break Plan (Podverse + Metaboost)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Hard-broke Podverse app schema by dropping `account_trust_tier_id` while preserving override columns.
- Switched entitlement defaults to membership tier (`trial`/`premium`) + expiry guard ordering.
- Removed trust-tier management API/web contracts and updated management-web tests/translations to membership-default language.
- Added explicit membership-tier capability default env keys for API runtime configuration.

#### Files Modified

- `.llm/history/active/trust-tier-hard-break/trust-tier-hard-break-part-01.md`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0023_remove_account_trust_tier.sql`
- `infra/k8s/base/ops/kustomization.yaml`
- `infra/k8s/base/api/source/api.env`
- `apps/api/src/lib/accountEntitlements.ts`
- `apps/api/src/lib/auth/index.ts`
- `apps/api/src/controllers/account/accountFollowingAddByRSSChannel.ts`
- `apps/api/.env.example`
- `packages/helpers/src/lib/accountTrust.ts`
- `packages/helpers/src/lib/accountMembership.ts`
- `packages/helpers/src/dtos/account/accountMembershipStatus.ts`
- `packages/orm/src/entities/account/accountMembershipStatus.ts`
- `packages/orm/src/services/account/accountMembershipStatus.ts`
- `packages/orm/src/services/account/account.ts`
- `packages/orm/src/services/account/accountPayPalOrder.ts`
- `apps/management-api/src/routes/users.ts`
- `apps/management-web/src/lib/requests/users.ts`
- `apps/management-web/src/app/(management)/users/new/NewUserPageClient.tsx`
- `apps/management-web/src/app/(management)/users/[id]/edit/EditUserPageClient.tsx`
- `apps/management-web/e2e/users-new-create-username-only.spec.ts`
- `apps/management-web/i18n/originals/en-US.json`
- `apps/management-web/i18n/originals/es.json`
- `apps/management-web/i18n/originals/fr.json`
- `apps/management-web/i18n/originals/el-GR.json`

### Session 2 - 2026-05-04

#### Prompt (Developer)

do it

#### Key Decisions

- Regenerate linear baseline `.sql.gz` snapshots after adding app linear migration `0023_remove_account_trust_tier.sql`.
- Verify generated snapshots are aligned using the repo baseline verification script.

#### Files Modified

- `.llm/history/active/trust-tier-hard-break/trust-tier-hard-break-part-01.md`
- `infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz`

### Session 3 - 2026-05-04

#### Prompt (Developer)

# Root cause recap

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Removed stale `AccountMembershipTrustTierLegacyMap` re-export from `packages/helpers/src/index.ts` (symbol no longer exists in `accountMembership.ts`).
- Regenerated `@podverse/helpers` `dist/` via `npm run build:packages` so `resolveAccountEntitlements` is typed with `AccountMembershipEnum` instead of stale `AccountTrustTierEnum` in `accountTrust.d.ts`, fixing api TS2345.
- Confirmed `npm run lint:fix` passes (type-check, eslint, prettier).

#### Files Modified

- `.llm/history/active/trust-tier-hard-break/trust-tier-hard-break-part-01.md`
- `packages/helpers/src/index.ts`
