### Session 1 - 2026-05-03

#### Prompt (Developer)

Podverse Trust Gating Big-Bang Plan Set

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Execute the attached trust-gating plan end-to-end in Podverse.
- Use a centralized entitlement resolver with trust-tier defaults and per-account overrides.
- Replace API `noFreeTrial` gating with `requiredCapability` checks on auth middleware.
- Keep membership expiration as a hard gate and return structured, non-alarming renewal-friendly responses.
- Add trust-tier and per-account override fields directly on `account_membership_status`.

#### Files Modified

- .llm/history/active/trust-gating-big-bang/trust-gating-big-bang-part-01.md
- packages/helpers/src/lib/accountTrust.ts
- packages/helpers/src/index.ts
- packages/helpers/src/lib/accountMembership.ts
- packages/helpers/src/dtos/account/accountMembershipStatus.ts
- packages/orm/src/entities/account/accountMembershipStatus.ts
- packages/orm/src/services/account/accountMembershipStatus.ts
- packages/orm/src/services/account/account.ts
- packages/orm/src/services/account/accountPayPalOrder.ts
- packages/orm/src/services/account/accountFollowingAddByRSSChannel.ts
- apps/api/src/lib/accountEntitlements.ts
- apps/api/src/@types/express.d.ts
- apps/api/src/lib/auth/index.ts
- apps/api/src/controllers/mq/mq.ts
- apps/api/src/controllers/account/accountAddByRSSParse.ts
- apps/api/src/controllers/account/accountFollowingAddByRSSChannel.ts
- apps/api/src/controllers/account/accountNotificationChannel.ts
- apps/api/src/controllers/account/accountNotificationChannelType.ts
- apps/api/src/controllers/account/accountSettings/accountSettingsNotificationType.ts
- apps/api/src/controllers/stats/statsTrackEventAccount.ts
- apps/api/src/controllers/stats/statsTrackEventChannel.ts
- apps/api/src/controllers/stats/statsTrackEventClip.ts
- apps/api/src/controllers/stats/statsTrackEventItem.ts
- apps/api/src/controllers/stats/statsTrackEventPlaylist.ts
- apps/api/src/test/account-follows-notifications.test.ts
- apps/management-api/src/routes/users.ts
- apps/management-web/src/lib/requests/users.ts
- apps/management-web/src/app/(management)/users/new/NewUserPageClient.tsx
- apps/management-web/src/app/(management)/users/[id]/edit/EditUserPageClient.tsx
- apps/web/src/contexts/Modals.tsx
- apps/web/src/components/Modal/ModalLoginRequired.tsx
- apps/web/src/components/PodcastIndex/PodcastIndexFeedInfo.tsx
- apps/web/src/components/List/ListChannelSettings.tsx
- apps/web/src/constants/routes.ts
- apps/web/src/components/Banner/MembershipExpiredBanner.tsx
- apps/web/src/styles/components/Banner/MembershipExpiredBanner.module.scss
- apps/web/src/app/layout.tsx
- apps/web/src/app/membership/renew/page.tsx
- apps/web/i18n/originals/en-US.json
- infra/k8s/base/ops/source/database/linear-migrations/app/0021_account_trust_and_entitlement_overrides.sql
- infra/k8s/base/ops/kustomization.yaml
- infra/k8s/base/api/source/api.env
- infra/k8s/base/db/source/bootstrap/0004_seed_linear_migration_history.sql
- infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz
- infra/k8s/base/db/source/bootstrap/0003b_management_linear_baseline.sql.gz

### Session 2 - 2026-05-04

#### Prompt (Developer)

do it

#### Key Decisions

- Expand management user edit/create payloads to include membership lifecycle fields (`account_membership_id`, `membership_expires_at`) alongside trust settings.
- Enforce tier-aligned defaults during membership transitions by auto-deriving trust tier when membership is changed and resetting override values when tier changes.

#### Files Modified

- apps/management-api/src/routes/users.ts
- apps/management-web/src/lib/requests/users.ts
- apps/management-web/src/app/(management)/users/new/NewUserPageClient.tsx
- apps/management-web/src/app/(management)/users/[id]/edit/EditUserPageClient.tsx
- packages/orm/src/services/account/accountMembershipStatus.ts
- .llm/history/active/trust-gating-big-bang/trust-gating-big-bang-part-01.md

### Session 3 - 2026-05-04

#### Prompt (Developer)

Trial/Premium Terminology Revision Plan

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Canonicalize status terminology to Trial/Premium while preserving trust-tier defaults and per-user overrides.
- Add a forward migration (`0022`) to hard-break membership tier lookup values from `basic` to `premium`.
- Keep compatibility in code by retaining the deprecated `AccountMembershipEnum.Basic` alias while switching active references to `Premium`.
- Update management create/edit UX copy to Trial/Premium with helper text.
- Update user membership copy and add a Trial limitations section that lists current entitlement-gated behaviors.

#### Files Modified

- packages/helpers/src/lib/accountMembership.ts
- packages/helpers/src/dtos/account/accountMembership.ts
- packages/orm/src/entities/account/accountMembership.ts
- packages/orm/src/services/account/accountMembershipStatus.ts
- packages/orm/src/services/account/accountPayPalOrder.ts
- apps/management-api/src/routes/users.ts
- apps/management-web/src/app/(management)/users/new/NewUserPageClient.tsx
- apps/management-web/src/app/(management)/users/[id]/edit/EditUserPageClient.tsx
- apps/management-web/src/app/(management)/users/[id]/edit/page.module.scss
- apps/web/src/app/membership/page.tsx
- apps/web/src/styles/app/membership/Membership.module.scss
- apps/web/i18n/originals/en-US.json
- infra/k8s/base/ops/source/database/linear-migrations/app/0022_account_membership_tier_trial_premium.sql
- infra/k8s/base/ops/kustomization.yaml
- infra/k8s/base/api/source/api.env
- infra/k8s/base/db/source/bootstrap/0004_seed_linear_migration_history.sql
- infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz
- infra/k8s/base/db/source/bootstrap/0003b_management_linear_baseline.sql.gz
- .llm/history/active/trust-gating-big-bang/trust-gating-big-bang-part-01.md
