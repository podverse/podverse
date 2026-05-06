# env-expiration-naming

**Started:** 2026-05-04  
**Author:** Cursor Agent

---

### Session 1 - 2026-05-04

#### Prompt (Developer)

DEFAULT_FREE_TRIAL_EXPIRATION_SECONDS

this is the wrong convention we want \_EXPIRATION to end env and js variable names, not have a denomination afterward. \_EXPIRATION env vars should always be seconds so we can infer that. if you don't have skills that already inform you for this standard then add them

#### Key Decisions

- Renamed canonical constant to **`DEFAULT_FREE_TRIAL_EXPIRATION`** (value still seconds; unit implied by `_EXPIRATION`).
- Updated `parseEnvExpiration.ts` file-level convention comment and Podverse call sites (API config, management-api users route, management-web create-user defaults, `membershipProductDefaultsFromEnv`).
- Added **`.cursor/skills/env-expiration-naming/SKILL.md`** and **`.cursor/rules/env-expiration-naming.mdc`**.

#### Files Created/Modified

- `packages/helpers/src/lib/parseEnvExpiration.ts`
- `packages/helpers/src/lib/membershipProductDefaultsFromEnv.ts`
- `apps/api/src/config/index.ts`
- `apps/management-api/src/routes/users.ts`
- `apps/management-web/src/lib/createUserFormDefaults.ts`
- `.cursor/skills/env-expiration-naming/SKILL.md`
- `.cursor/rules/env-expiration-naming.mdc`

### Session 2 - 2026-05-05

#### Prompt (Developer)

@podverse/apps/api/src/config/index.ts:108-110 all of these env vars seem like they should be in a shared constants helper package of some sort

#### Key Decisions

- Moved auth/email/reset expiration default constants from app config to shared helpers so API and management-api use one source.
- Reused the existing `parseEnvExpiration` helper module as the shared home for expiration defaults to keep all `_EXPIRATION` conventions together.

#### Files Modified

- .llm/history/active/env-expiration-naming/env-expiration-naming-part-01.md
- packages/helpers/src/lib/parseEnvExpiration.ts
- apps/api/src/config/index.ts
- apps/management-api/src/config/index.ts
