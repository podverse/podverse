# 03 — Metaboost implementation plan

## Execution context (required)

- Use this plan set from `~/r/p/podverse-custom-css-remote-file` on `feature/custom-css-remote-file`.
- Apply implementation changes in Metaboost repo paths under `~/repos/pv/metaboost` when executing this phase.

## Objective

Implement equivalent operator remote custom theme behavior in Metaboost web + management-web with the same contract and precedence semantics as Podverse.

## Locked dependencies from prompts 01 and 02

- Contract + precedence source of truth:
  - `.llm/plans/completed/custom-css-remote-file-operator-themes/01-shared-contract-and-fixtures.md`
- Podverse parity reference:
  - `.llm/plans/completed/custom-css-remote-file-operator-themes/02-podverse-plan.md`

## Phase A — Env, sidecar, and runtime-config contract wiring

### A1. Add `NEXT_PUBLIC_CUSTOM_THEMES_URL` to Metaboost env surfaces

Update:

- `apps/web/sidecar/.env.example`
- `apps/management-web/sidecar/.env.example`
- `infra/config/env-templates/web-sidecar.env.example`
- `infra/config/env-templates/management-web-sidecar.env.example`
- `infra/k8s/base/web/source/web-sidecar.env`
- `infra/k8s/base/management-web/source/management-web-sidecar.env`
- `scripts/local-env/setup.sh`

Constraints:

- `.env.example` values are double-quoted when non-empty.
- `infra/k8s/**/source/*.env` values are unquoted.
- Comments explicitly document URL policy (`https://*`, plus local `http://localhost` and `http://127.0.0.1` only).

### A2. Extend runtime-config key models

Update:

- `apps/web/src/config/runtime-config.ts`
- `apps/management-web/src/config/runtime-config.ts`
- runtime config tests:
  - `apps/web/src/config/runtime-config-store.test.ts`
  - `apps/management-web/src/config/runtime-config-store.test.ts`

Tasks:

- Add `NEXT_PUBLIC_CUSTOM_THEMES_URL` to runtime env key unions.
- Keep key optional in both apps.
- Ensure sidecar JSON parsing/store logic accepts and preserves the key.

### A3. Sidecar validation and pass-through

Update:

- `apps/web/sidecar/src/server.ts`
- `apps/management-web/sidecar/src/server.ts`

Tasks:

- Add key to optional sidecar runtime-config key lists.
- Add URL validator for this key:
  - allow `https://*`
  - allow `http://localhost*` and `http://127.0.0.1*`
  - reject other `http://` hosts
- Keep error semantics aligned with existing sidecar validation:
  - invalid value is reported in startup validation
  - missing optional value is allowed

Deliverable:

- `/runtime-config` includes normalized `NEXT_PUBLIC_CUSTOM_THEMES_URL` when valid.

## Phase B — Shared UI dynamic theme registry (Metaboost-specific)

### B1. Replace static `THEMES` assumptions with registry-backed model

Update:

- `packages/ui/src/lib/settingsCookie.ts`
- `packages/ui/src/contexts/ThemeContext/ThemeContext.tsx`
- `packages/ui/src/components/navigation/ThemeSelector/ThemeSelector.tsx`

Current constraint to remove:

- `THEMES = ['light', 'dark', 'dracula']` static tuple currently drives validation and toggle/selector options.

Target shape:

- built-in registry remains available as baseline.
- runtime registry can include custom themes from remote pack.
- cookie parsing validates against current runtime registry, not static tuple only.

### B2. Add shared remote-theme pack loader utility

Create a shared loader in Metaboost (prefer `packages/ui/src/lib/` or another shared package used by both web apps) with:

- `isAllowedCustomThemesUrl(url)`
- `fetchRemoteThemePack(url)`
- `validateRemoteThemePack(json)`
- `getCustomThemeDefault(themePack)` (first theme ID)
- `mergeBuiltInAndCustomThemes(...)`

Validation rules must match prompt 01 exactly:

- `version` required string
- `themes` required non-empty array
- unique non-empty `id`
- `cssVariables` keys must start with `--` and values must be non-empty strings
- optional locale `labels`

### B3. Failure handling and logging

- On fetch/validation failure:
  - log once per process lifecycle using existing app logging patterns
  - return `null` custom theme pack
  - preserve built-in-only behavior + normal `NEXT_PUBLIC_DEFAULT_THEME` handling
- On success:
  - include custom themes in theme registry
  - mark first custom theme as effective default

## Phase C — Precedence and app integration (web + management-web)

### C1. Web integration

Update:

- `apps/web/src/config/runtime-config.server.ts`
- `apps/web/src/config/runtime-config-store.ts`
- `apps/web/src/app/layout.tsx`

Tasks:

- Read `NEXT_PUBLIC_CUSTOM_THEMES_URL` from runtime config.
- Load/validate custom theme pack during SSR path (before rendering `ThemeWrapper`).
- Pass resolved theme registry/default into UI theme provider path.

Precedence:

- custom pack success => default is first custom theme; ignore `NEXT_PUBLIC_DEFAULT_THEME`
- custom pack failure or missing URL => use built-ins and normal default handling

### C2. Management-web integration

Update:

- `apps/management-web/src/config/runtime-config.server.ts`
- `apps/management-web/src/config/runtime-config-store.ts`
- `apps/management-web/src/app/layout.tsx`

Tasks:

- Mirror web behavior exactly.
- Keep settings cookie names unchanged (`web-settings`, `management-settings`).
- Ensure SSR `initialTheme` resolution accepts custom IDs when custom registry is active.

## Phase D — SSR-first variable application and no-FOUC

### D1. Theme variables on first paint

Update:

- `apps/web/src/app/layout.tsx`
- `apps/management-web/src/app/layout.tsx`
- `packages/ui/src/styles/_themes.scss` (baseline token source remains)

Tasks:

- Emit active custom theme CSS variables in SSR HTML before hydration (inline style tag or equivalent deterministic mechanism).
- Ensure root wrapper initial paint uses selected custom variables immediately.

### D2. `next.config` decision task (explicit)

Review and document for:

- `apps/web/next.config.mjs`
- `apps/management-web/next.config.mjs`

Decision rule:

- If theme JSON is fetched server-side from sidecar-provided URL, no Next image/remote domain changes are needed.
- If any browser-side remote JSON fetch is introduced later, add required config/CSP updates explicitly.

## Phase E — Local fixtures, E2E, and operator docs

### E1. Metaboost-local fixture serving strategy

Metaboost currently has no `tools/test-assets` package. Implement one of these and document the chosen approach:

- Option A (preferred parity): add lightweight `tools/test-assets` static server serving `assets/themes/*.json` on `http://localhost:2111`.
- Option B: add fixtures under an existing served path and expose a deterministic local URL for sidecar use.

Required fixture set (same as prompt 01):

- `custom-themes.multi.json`
- `custom-themes.minimal.json`
- `custom-themes.invalid.json`

### E2. E2E coverage hooks to add in Metaboost

Add/extend specs under:

- `apps/web/e2e/**`
- `apps/management-web/e2e/**`

Coverage needed:

- URL not configured => built-in behavior
- URL configured + valid custom => first custom default + selector shows labels
- URL configured + invalid/fetch failure => fallback to built-in and normal default handling
- first render reflects resolved theme before user interaction

### E3. Docs

Update:

- `docs/development/env/ENV-REFERENCE.md`
- `docs/STYLES-SCSS.md`
- any runtime-config sidecar docs that list `NEXT_PUBLIC_*` allowlists

Must document:

- new env key `NEXT_PUBLIC_CUSTOM_THEMES_URL`
- precedence semantics vs `NEXT_PUBLIC_DEFAULT_THEME`
- local fixture serving instructions
- production HTTPS hosting expectations

## Exit criteria

- Metaboost behavior matches prompt-01 contract and precedence exactly.
- Sidecars validate and expose `NEXT_PUBLIC_CUSTOM_THEMES_URL`.
- UI theme system supports runtime custom theme registry (not static tuple only).
- SSR first paint uses resolved custom variables (no flash of wrong theme).
- Web + management-web E2E and unit coverage include success/failure precedence cases.
