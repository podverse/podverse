# Mobile env consistency + shared validation core

**Status:** planned (not implemented)
**Trigger:** hardcoded `/api` `/v2` defaults in [apps/mobile/src/auth/mobileApi.ts](/apps/mobile/src/auth/mobileApi.ts) caused a `/apiv2/...` 404; broader gap is mobile has no `.env.example`, no env validation, and is not wired into `make local_env_setup`.

## Goal

Make mobile API config env-driven and validated, consistent with the rest of the monorepo:

- Base URL env var is the single source of truth (host, port, prefix, version).
- One shared, reusable **value-based** validation core (no `process.env` coupling) used by both backend (`@podverse/helpers-config`) and mobile.
- Mobile participates in `make local_env_setup` / prepare / link like other apps.
- abcmemory records the env-var + local-env conventions for mobile and all apps.

## Context (already true)

- The 404 is already fixed: `/api` + `/v2` defaults resolve a no-path base URL to `.../api/v2`. This set is the consistency refactor, not the bug fix.
- Expo/Metro inlines only literal `process.env.EXPO_PUBLIC_NAME` references (static find-and-replace). Dynamic `process.env[name]` / destructuring is not inlined (Expo docs; issue #24236). This is why `@podverse/helpers-config` (dynamic `process.env[varName]`) cannot validate mobile env, and why the shared core must be value-based.
- `@podverse/helpers-config` is on the mobile denylist ([apps/mobile/AGENTS.md](/apps/mobile/AGENTS.md)); `@podverse/helpers` is allowed.

## Locked decisions

- Config source of truth: fold prefix/version into `EXPO_PUBLIC_MOBILE_API_BASE_URL[_IOS|_ANDROID]` (e.g. `http://10.0.2.2:4230/api/v2`); code constants become documented last-resort fallback only.
- Shared core location: `@podverse/helpers` (mobile-safe). `ValidationResult`/`ValidationSummary` types move there; `@podverse/helpers-config` re-exports for back-compat and wraps with `process.env` reads.
- Mobile validation: read literal `process.env.EXPO_PUBLIC_MOBILE_*`; valid when unset (UI-only), else must be an absolute http(s) URL that yields a non-empty prefix+version base. Surface via `console.error`; throw when `EXPO_PUBLIC_MOBILE_E2E==='1'` so E2E fails fast.
- Mobile joins `make local_env_setup`: generate `apps/mobile/.env` from `apps/mobile/.env.example`.
- Shared local API endpoint (used by both web and mobile) is defined **once** in a home override via `local_env_prepare` / `local_env_link`; `setup.sh` derives per-app values (web sidecar split vars; mobile iOS `localhost` vs Android `10.0.2.2`, each with `/api/v2`) through `apply_override`. No duplicating the shared value across templates.

## Outputs

- `packages/helpers/src/**` value-based validators + shared `ValidationResult` types.
- `packages/helpers-config/src/startupValidation.ts` wrappers delegate to core.
- `apps/mobile/src/auth/mobileApi.ts` (fallback framing), `apps/mobile/src/config/validateMobileEnv.ts`, wiring at the config boundary.
- `apps/mobile/.env.example`.
- `makefiles/local/Makefile.local.env.mk` + `scripts/local-env/setup.sh` mobile entries.
- abcmemory: `mobile-react-native` rule, `mobile-expo-monorepo` skill, plus a repo-wide env-vars-via-local-env principle.

## Out of scope

- Migrating every domain-specific validator (locale/theme/signup) to value-based — optional follow-up; only generic validators + those mobile needs are migrated now.
- Any production/CI env delivery changes (this is local-dev + E2E consistency).
