# 02 — Podverse implementation plan

## Execution context (required)

- Work only from `~/r/p/podverse-custom-css-remote-file`
- Branch must be `feature/custom-css-remote-file`

## Objective

Implement operator remote custom themes for Podverse web + management-web with first-render application and strict default precedence.

## Locked dependencies from Prompt 01

- Contract + precedence source of truth:
  - `.llm/plans/completed/custom-css-remote-file-operator-themes/01-shared-contract-and-fixtures.md`
- Fixture URLs:
  - `http://localhost:2111/themes/custom-themes.multi.json`
  - `http://localhost:2111/themes/custom-themes.minimal.json`
  - `http://localhost:2111/themes/custom-themes.invalid.json`

## Phase A — Env and sidecar contract wiring

### A1. Add new env key for both sidecars

Add `NEXT_PUBLIC_CUSTOM_THEMES_URL` to:

- `apps/web/sidecar/.env.example`
- `apps/management-web/sidecar/.env.example`
- `infra/k8s/base/web/source/web-sidecar.env`
- `infra/k8s/base/management-web/source/management-web-sidecar.env`
- `dev/env-overrides/local/theme.env.example`
- `scripts/local-env/setup.sh`

Constraints:

- Sidecar env examples use double-quoted non-empty values.
- K8s `source/*.env` values are unquoted.
- Comment text must describe URL policy (`https://*`, localhost/127 local HTTP only).

### A2. Include key in runtime-config type allowlists

- `apps/web/src/config/runtime-config.ts`
- `apps/management-web/src/config/runtime-config.ts`

Tasks:

- Add `NEXT_PUBLIC_CUSTOM_THEMES_URL` to runtime env key union type.
- Add key to required/optional allowlist as optional.
- Update runtime config store tests that assert key sets:
  - `apps/web/src/config/runtime-config-store.test.ts`
  - `apps/management-web/src/config/runtime-config-store.test.ts`

### A3. Sidecar pass-through + validation

- `apps/web/sidecar/src/server.ts`
- `apps/management-web/sidecar/src/server.ts`
- `packages/helpers-config/src/startupValidation.ts` (if env startup validation coverage exists for sidecar keys)

Tasks:

- Add key to sidecar allowed runtime keys list.
- Validate URL format in sidecar normalization path:
  - accept `https://*`
  - accept `http://localhost*` and `http://127.0.0.1*`
  - reject all other `http://` hosts
- Keep invalid value behavior consistent with existing sidecar key validation:
  - warning/error classification
  - omit invalid key from emitted runtime-config payload

Deliverable:

- `/runtime-config` payload can include sanitized `NEXT_PUBLIC_CUSTOM_THEMES_URL`.

## Phase B — Shared custom-theme loader module

### B1. Add loader utility used by both web apps

Create a shared utility in a cross-app location (prefer `packages/helpers-browser` or a shared app config helper directory) with:

- `fetchRemoteThemePack(url)`
- `validateRemoteThemePack(data)`
- `isAllowedCustomThemeUrl(url)`
- `mergeBuiltInAndCustomThemes()`

Contract rules (must match prompt 01):

- top-level `version` (required string)
- top-level `themes` (required non-empty array)
- theme `id` required, unique, non-empty
- theme `cssVariables` required, keys start with `--`, values non-empty strings
- optional `labels` locale map

### B2. Failure and caching strategy

- One request-time fetch attempt in SSR path per process boot, then cache resolved result in-memory (same pattern as runtime-config sidecar fetch caching).
- If fetch or validation fails:
  - log once per process lifecycle (avoid noisy duplicate logs)
  - return `null` custom-theme pack
  - caller falls back to built-in-only behavior

### B3. Unit tests for loader

Add tests that prove:

- valid multi/minimal fixtures pass
- invalid fixture fails validation
- URL allowlist enforcement
- duplicate IDs fail
- malformed CSS variable keys fail

## Phase C — Theme resolution precedence integration

### C1. Web theme resolver integration

- `apps/web/src/utils/localSettings/uiTheme.ts`
- `apps/web/src/utils/localSettings/localSettings.ts`
- `apps/web/src/utils/localSettings/uiTheme.test.ts`

Tasks:

- Extend valid theme list source to include custom themes when remote pack is valid.
- Enforce precedence:
  - if custom pack exists: default theme = first custom theme ID
  - ignore `NEXT_PUBLIC_DEFAULT_THEME` in this case
  - if no custom pack: keep current built-in fallback flow
- Preserve existing local setting parsing key (`uit`) and cookie behavior.

### C2. Management-web theme resolver integration

- `apps/management-web/src/utils/uiTheme.ts`
- `apps/management-web/src/utils/uiTheme.test.ts`
- `apps/management-web/src/components/ManagementThemeSwitcher/ManagementThemeSwitcher.tsx`

Tasks:

- Mirror web precedence behavior exactly.
- Keep `UI_THEME_COOKIE` behavior unchanged.
- Ensure fallback to built-ins when remote fetch/validation fails.

## Phase D — SSR first-render variable application (no FOUC)

### D1. Root layout pre-hydration theme selection

- `apps/web/src/app/layout.tsx`
- `apps/management-web/src/app/layout.tsx`

Tasks:

- Resolve runtime config first (existing sidecar fetch path).
- Resolve custom theme pack server-side before rendering `<html data-ui-theme=...>`.
- Ensure `toUITheme(...)` path can resolve custom theme IDs on SSR before hydration.

### D2. CSS variable injection strategy

Implement one shared strategy for custom theme variables at first render:

- Option A (preferred): inline `<style id="custom-theme-vars">` in SSR `<head>` for active theme only.
- Option B: deterministic class/token map if existing theme system already supports dynamic variable registry server-side.

Requirements:

- Active custom theme variables must be present in initial HTML response.
- No hydration-time flash where built-in variables appear before custom ones.

### D3. `next.config` decision task (explicit)

- `apps/web/next.config.mjs`
- `apps/management-web/next.config.mjs` (if present)

Decision:

- No remote image/domain config changes are required if theme JSON fetch is server-side via runtime-config URL.
- If any client-side fallback fetch path is introduced, explicitly document whether CSP/remote policies require updates.

## Phase E — Selector UX + labels

### E1. Surface custom themes in selectors

- `apps/web/src/components/Settings/Panels/SettingsGeneral/SettingsThemeSelector.tsx`
- `apps/management-web/src/components/ManagementThemeSwitcher/ManagementThemeSwitcher.tsx`

Tasks:

- Include custom themes in option lists after built-ins (or in documented order).
- Label resolution:
  - use locale-specific `labels[locale]` when available
  - fallback to `labels[default-locale]`
  - fallback to `id`

### E2. Persistence behavior

- Existing persisted value keys remain unchanged.
- If stored theme ID is no longer valid (remote changed), fallback to active default for that run.

## Phase F — Podverse docs and local/K8s operator setup

Update:

- `apps/web/ENV.md`
- `apps/management-web/ENV.md` (if theme config documented there)
- `docs/development/env/ENV-REFERENCE.md` (if sidecar runtime keys are cataloged)
- any theme operator doc that currently describes only `NEXT_PUBLIC_SUPPORTED_THEMES` + `NEXT_PUBLIC_DEFAULT_THEME`

Must document:

- new key: `NEXT_PUBLIC_CUSTOM_THEMES_URL`
- precedence with `NEXT_PUBLIC_DEFAULT_THEME`
- local fixture usage via test-assets server
- K8s operator setup example for HTTPS-hosted JSON

## Phase G — Test coverage plan to implement with code

### G1. Unit tests

- Loader contract tests (schema + URL policy)
- `uiTheme` resolver tests for both web and management-web:
  - URL not set => built-in behavior
  - URL set + valid custom => first custom theme default
  - URL set + invalid/failed => built-in fallback with normal default handling

### G2. E2E tests (defer full matrix to prompt 04, but add Podverse hooks now)

- Add targeted spec updates in:
  - `apps/web/e2e/**`
  - `apps/management-web/e2e/**`
- Validate first render theme on initial page load (before user interaction), not just post-hydration toggle.

## Exit criteria

- Podverse runtime-config exposes `NEXT_PUBLIC_CUSTOM_THEMES_URL` through sidecars.
- Both web apps enforce precedence exactly:
  - custom success => first custom theme default + ignore `NEXT_PUBLIC_DEFAULT_THEME`
  - custom failure => built-in fallback + normal `NEXT_PUBLIC_DEFAULT_THEME`
- SSR first render includes active custom CSS variables (no flash of wrong theme).
- Theme selectors show custom options and locale labels with stable fallbacks.
- Unit + E2E coverage exists for success and failure paths.
