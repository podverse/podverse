# 04 — E2E matrix and verification

## Execution context (required)

- Work only from `~/r/p/podverse-custom-css-remote-file`
- Branch must be `feature/custom-css-remote-file`

## Objective

Define E2E coverage for env-combination behavior and first-render theme application in Podverse and Metaboost.

## Locked contract and fixtures

- Contract + precedence source of truth:
  - `.llm/plans/completed/custom-css-remote-file-operator-themes/01-shared-contract-and-fixtures.md`
- Fixture URLs (local HTTP):
  - `http://localhost:2111/themes/custom-themes.multi.json`
  - `http://localhost:2111/themes/custom-themes.minimal.json`
  - `http://localhost:2111/themes/custom-themes.invalid.json`

## Matrix dimensions

Apply this matrix to both repos, and for each repo to both web + management-web apps.

### Dimension A: custom URL mode

- A1: URL unset
- A2: URL set to valid multi fixture
- A3: URL set to valid minimal fixture
- A4: URL set to invalid fixture
- A5: URL set to unreachable endpoint (network/404 failure)

### Dimension B: existing theme env knobs

- B1: `NEXT_PUBLIC_SUPPORTED_THEMES` unset; `NEXT_PUBLIC_DEFAULT_THEME` unset
- B2: `NEXT_PUBLIC_SUPPORTED_THEMES` set; `NEXT_PUBLIC_DEFAULT_THEME` set

### Dimension C: app surface

- C1: web app
- C2: management-web app

## Required scenario matrix (must be implemented)

Minimum required scenario set per app (`C1`, `C2`) in each repo:

1. A1 + B1 — baseline built-in behavior unchanged.
2. A2 + B1 — custom valid multi with no theme env knobs.
3. A2 + B2 — custom valid multi while both knobs are set.
4. A3 + B2 — custom valid minimal while both knobs are set.
5. A4 + B2 — invalid payload fallback behavior.
6. A5 + B2 — fetch failure fallback behavior.

This yields 6 scenarios per app, 12 per repo, 24 cross-repo.

## Assertion contract for every scenario

### Core precedence assertions

- If A2/A3 (valid custom):
  - custom theme IDs appear in selector options.
  - first custom theme ID is effective default.
  - `NEXT_PUBLIC_DEFAULT_THEME` is ignored.
  - `NEXT_PUBLIC_SUPPORTED_THEMES` does not block valid custom themes.
- If A1 (no custom URL):
  - built-in behavior exactly matches pre-feature behavior.
- If A4/A5 (invalid/failure):
  - built-in theme list is used.
  - `NEXT_PUBLIC_DEFAULT_THEME` behavior is restored.
  - no custom theme IDs appear in selector options.

### First-render assertions (mandatory)

For each scenario, assert SSR-first render state before user interaction:

- Root theme attribute (`data-ui-theme` or equivalent) equals expected initial theme.
- One representative CSS custom property value on first paint equals expected theme value.
- No transition from fallback built-in theme to custom theme after hydration for valid custom scenarios.

Implementation guidance:

- Capture expected value from fixture (`custom-themes.multi.json` / `custom-themes.minimal.json`).
- Evaluate initial DOM state immediately after first page load.
- Add explicit step screenshot for initial render state and keep assertion attached to screenshot helper target.

## Podverse-specific E2E plan

### Files to add/update

- `apps/web/e2e/**`:
  - add one dedicated custom-theme precedence spec (or split by scenario set).
- `apps/management-web/e2e/**`:
  - add one dedicated management custom-theme precedence spec.
- E2E env/setup wiring:
  - use existing make-driven E2E setup and inject `NEXT_PUBLIC_CUSTOM_THEMES_URL` per scenario variant.

### Podverse local fixture hosting

- Use existing `podverse-test-assets` server on `localhost:2111`.
- Ensure fixture server is started before scenario runs requiring A2/A3/A4.

### Podverse report commands (operator verification)

- web scenario report target:
  - `make e2e_test_web_report_spec SPEC=<custom-theme-spec>.spec.ts`
- management scenario report target:
  - `make e2e_test_management_web_report_spec SPEC=<custom-theme-spec>.spec.ts`

## Metaboost-specific E2E plan

### Files to add/update

- `apps/web/e2e/**`:
  - add one dedicated custom-theme precedence spec.
- `apps/management-web/e2e/**`:
  - add one dedicated custom-theme precedence spec.
- scenario env injection:
  - wire `NEXT_PUBLIC_CUSTOM_THEMES_URL` and theme knobs through existing E2E app startup env path.

### Metaboost local fixture hosting decision

Because Metaboost currently has no `tools/test-assets` server, enforce one of:

- add a minimal fixture server in-repo (preferred parity), or
- reuse an existing local static server path with deterministic URLs.

The chosen approach must provide A2/A3/A4 fixture URLs during E2E runs.

### Metaboost report commands (operator verification)

- web scenario report target:
  - `make e2e_test_web_report_spec SPEC=<custom-theme-spec>.spec.ts`
- management scenario report target:
  - `make e2e_test_management_web_report_spec SPEC=<custom-theme-spec>.spec.ts`

## Deterministic checks and anti-flake rules

- Do not assert based on async UI transitions alone; assert SSR-visible state first.
- Keep fixture IDs and CSS variable keys stable across tests.
- Avoid network dependence beyond local fixture host for matrix runs.
- For failure scenario A5, use a deterministic unreachable URL (`http://127.0.0.1:1/...` or equivalent) to force immediate failure.

## Traceability mapping (must include in test code comments)

For each scenario, include a short comment mapping to matrix ID:

- `A1_B1_C1`, `A2_B1_C1`, `A2_B2_C1`, ...
- same for `C2`.

This guarantees all required cells are implemented and reviewable.

## Exit criteria

- All 6 required scenarios implemented per app surface (`C1`, `C2`) in both repos.
- Precedence behavior is proven by explicit assertions for success and failure paths.
- First-render correctness is validated with deterministic, non-flaky checks.
- Operator verification commands are scoped to the new specs and runnable via make targets.
