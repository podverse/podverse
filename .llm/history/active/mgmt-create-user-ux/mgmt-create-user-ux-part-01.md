# mgmt-create-user-ux (Podverse)

**Started:** 2026-05-04
**Context:** Podverse management-web create-user UX plan completion (handoff session).

## Session 1 - 2026-05-04

#### Prompt (Developer)

Management web create-user UX (Podverse + Metaboost)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Lighthouse `.env.api.example`: `FREE_TRIAL_EXPIRATION` documented and set as seconds (`2678400`), not days.
- `users-new-create-username-only.spec.ts`: assert `membership_expires_at` is a datetime-local string (form now sends computed trial expiry instead of `null`).
- Added **form-primary-actions-row** Cursor skill documenting `FormPrimaryActions` / Cancel-before-primary DOM order.

#### Files Created/Modified

- `tools/web-perf/lighthouse/.env.api.example`
- `apps/management-web/e2e/users-new-create-username-only.spec.ts`
- `.cursor/skills/form-primary-actions-row/SKILL.md`
- `apps/management-web/src/app/(management)/users/new/NewUserPageClient.tsx` (import sort via lint:fix)

## Session 2 - 2026-05-04

#### Prompt (Developer)

review the plan. is everything important finished? or did you missing anything? continue

#### Key Decisions

- Plan review: core feature work was already present; fixed misleading **seconds vs hours** comments
  for `AUTH_JWT_EXPIRATION` and `MANAGEMENT_API_SET_PASSWORD_EXPIRATION` in
  `apps/management-api/.env.example` (set-password was documented as hours but values are seconds).
- Removed unused `.formActions` from `users/new/page.module.scss` (footer uses `FormPrimaryActions`).
- Extended **form-primary-actions-row** with `CheckboxField` guidance; extended Metaboost
  **reusable-components** with `FormActions` + `Select` notes.

#### Files Created/Modified

- `apps/management-api/.env.example`
- `apps/management-web/src/app/(management)/users/new/page.module.scss`
- `.cursor/skills/form-primary-actions-row/SKILL.md`
- Metaboost repo: `.cursor/skills/reusable-components/SKILL.md`

## Session 3 - 2026-05-05

#### Prompt (Developer)

@podverse/infra/k8s/base/api/source/api.env:39 all of the membership related env vars should follow the MEMBERSHIP\_\* pattern. updates skills if needed. instead of FREE_TRIAL_EXPIRATION AND PREMIUM_MEMBERSHIP_COST those could be MEMBERSHIP_FREE_TRIAL_EXPIRATION and MEMBERSHIP_PREMIUM_COST

look for any other env vars or var names or fucntions or handling where you think this can be more consistent applied convention

#### Key Decisions

- Standardized membership env keys to `MEMBERSHIP_*` naming:
  - `FREE_TRIAL_EXPIRATION` → `MEMBERSHIP_FREE_TRIAL_EXPIRATION`
  - `PREMIUM_MEMBERSHIP_COST_MONTHLY` → `MEMBERSHIP_PREMIUM_COST_MONTHLY`
  - `PREMIUM_MEMBERSHIP_COST_ANNUALLY` → `MEMBERSHIP_PREMIUM_COST_ANNUALLY`
- Applied rename consistently across helpers/env parsing, API + management-api config/validation, K8s membership defaults, env examples, Lighthouse env files, and API docs.
- Updated `env-expiration-naming` skill examples to use `MEMBERSHIP_FREE_TRIAL_EXPIRATION`.
- Kept exported helper constant name `DEFAULT_FREE_TRIAL_EXPIRATION` stable to avoid cross-workspace export breakage while still enforcing the new env-key convention.
- While touching `apps/management-api/src/routes/users.ts`, replaced inline signup-mode literal union with shared `AccountSignupMode` type.

#### Files Created/Modified

- `.llm/history/active/mgmt-create-user-ux/mgmt-create-user-ux-part-01.md`
- `packages/helpers/src/lib/parseEnvExpiration.ts`
- `packages/helpers/src/lib/membershipProductDefaultsFromEnv.ts`
- `apps/api/src/config/index.ts`
- `apps/api/src/lib/startup/validation.ts`
- `apps/api/src/test/setup.ts`
- `apps/api/src/test/external-services-and-meta.test.ts`
- `apps/api/.env.example`
- `apps/api/.env`
- `apps/api/ENV.md`
- `apps/management-api/src/lib/startup/validation.ts`
- `apps/management-api/src/routes/users.ts`
- `apps/management-api/.env.example`
- `apps/management-web/src/lib/createUserFormDefaults.ts`
- `infra/k8s/base/api/source/api.env`
- `infra/k8s/base/membership-product/source/membership-product-defaults.env`
- `tools/web-perf/lighthouse/.env.api.example`
- `tools/web-perf/lighthouse/.env.api`
- `.cursor/skills/env-expiration-naming/SKILL.md`

## Session 4 - 2026-05-05

#### Prompt (Developer)

complete that work

#### Key Decisions

- Added shared `PremiumBillingCadence` type in `@podverse/helpers` and replaced inline `'monthly' | 'annual'` unions in management-api create-user body typing, management-web request types, create-user form defaults, and new-user page client state.

#### Files Created/Modified

- `.llm/history/active/mgmt-create-user-ux/mgmt-create-user-ux-part-01.md`
- `packages/helpers/src/lib/premiumBillingCadence.ts`
- `packages/helpers/src/index.ts`
- `apps/management-api/src/routes/users.ts`
- `apps/management-web/src/lib/requests/users.ts`
- `apps/management-web/src/lib/createUserFormDefaults.ts`
- `apps/management-web/src/app/(management)/users/new/NewUserPageClient.tsx`

## Session 5 - 2026-05-05

#### Prompt (Developer)

Consolidate Datetime-Local Formatting

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added shared `toDatetimeLocalInputValue` to `@podverse/helpers` date utilities so
  `datetime-local` values are generated in one place.
- Replaced create-user form local formatter with the shared helper to remove duplicated date
  formatting logic.
- Replaced edit-user form `String(...).slice(0, 16)` conversion with the same helper so local-time
  conversion is consistent across create/edit flows.

#### Files Created/Modified

- `.llm/history/active/mgmt-create-user-ux/mgmt-create-user-ux-part-01.md`
- `packages/helpers/src/lib/date.ts`
- `apps/management-web/src/lib/createUserFormDefaults.ts`
- `apps/management-web/src/app/(management)/users/[id]/edit/EditUserPageClient.tsx`
