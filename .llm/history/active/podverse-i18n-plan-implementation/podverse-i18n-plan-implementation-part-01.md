# podverse-i18n-plan-implementation

## Session 1 - 2026-05-04

#### Prompt (Developer)

Podverse uncommitted i18n: handled vs translating

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added `auth.confirmPassword`, `users.passwordsDoNotMatch`, `users.membershipForm.*`, and `users.advancedOverrides.*` to management-web `en-US.json`; replaced literals in `EditUserPageClient` and `NewUserPageClient` with `t()` / `ta()`.
- Ran `npm run i18n:translate` (web + management-web), `npm run i18n:compile`, and `npm run i18n:validate` — all passed.

#### Files Created/Modified

- apps/management-web/i18n/originals/en-US.json
- apps/management-web/i18n/originals/es.json
- apps/management-web/i18n/originals/fr.json
- apps/management-web/i18n/originals/el-GR.json
- apps/management-web/i18n/overrides/es.json
- apps/management-web/i18n/overrides/fr.json
- apps/management-web/i18n/overrides/el-GR.json
- apps/management-web/src/app/(management)/users/[id]/edit/EditUserPageClient.tsx
- apps/management-web/src/app/(management)/users/new/NewUserPageClient.tsx
- apps/web/i18n/originals/es.json
- apps/web/i18n/originals/fr.json
- apps/web/i18n/originals/el-GR.json
- apps/web/i18n/overrides/es.json
- apps/web/i18n/overrides/fr.json
- apps/web/i18n/overrides/el-GR.json
