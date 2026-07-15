# 02 — Mobile API base URL as single source of truth + validator

Make the env var (with `/api/v2` path) authoritative; add a mobile validator using the shared core from chunk 1.

## Tasks

1. `apps/mobile/src/auth/mobileApi.ts`:
   - Rename `DEFAULT_API_PREFIX` / `DEFAULT_API_VERSION` to `FALLBACK_API_PREFIX = '/api'` / `FALLBACK_API_VERSION = '/v2'` and comment that they apply ONLY when the base URL has no `/api/<version>` path.
   - Keep the `prefix.replace(/\/$/, '') + version` contract comment (prefix no trailing slash, version leading slash).
   - `parsePrefixAndVersion` already returns `/api` + `/v2` for a `/api/v2` path (chunk-0 fix). Leave that; just ensure the fallback branch uses the renamed constants.

2. `apps/mobile/src/config/validateMobileEnv.ts` (new):
   - Read literal `process.env.EXPO_PUBLIC_MOBILE_API_BASE_URL`, `_IOS`, `_ANDROID`, `EXPO_PUBLIC_MOBILE_E2E` (dot notation only).
   - Use value-based validators from `@podverse/helpers` (chunk 1): the effective base URL is valid when unset (UI-only), else must pass `validateAbsoluteHttpUrlValue` and yield a non-empty prefix+version base when parsed.
   - Export `validateMobileApiEnv(): ValidationResult[]` and a small `assertMobileApiEnvOrWarn()` helper.

3. Wire validation at the config boundary (`apps/mobile/src/config/apiBaseUrl.ts` or `mobileApi.ts`):
   - When a base URL is set but invalid: `console.error` a clear message (var name + why).
   - When `process.env.EXPO_PUBLIC_MOBILE_E2E === '1'` and invalid: throw so E2E fails fast instead of silent 404.
   - Preserve `getMobileApiBaseUrl()` returning `null` when unset (UI-only smoke unaffected).

4. `apps/mobile/.env.example` (new):
   - Document all four `EXPO_PUBLIC_MOBILE_*` vars with the `/api/v2` example, Node env formatting (double-quoted non-empty values; empty as bare `KEY=`).
   - Note it is optional (UI-only flows leave the URL unset) and that Expo auto-loads `apps/mobile/.env`.

5. Reconcile `scripts/mobile/dev-e2e.sh`:
   - Change exported URL defaults to include the path: `.../api/v2` (keep `:-` override form).
   - Keep `EXPO_PUBLIC_MOBILE_E2E=1`. Note that a generated `apps/mobile/.env` (chunk 3) can supply the URL, with these exports as fallback/override.

## Constraints

- Import validators by package name (`@podverse/helpers`), Tier D extensionless relative imports for app source.
- No dynamic `process.env[...]` in mobile — literals only.
- Do not run tests during agent work; end with operator verification commands (Mobile Maestro: `hello-world,auth-login,auth-logout,tab-switch-playback`).
