# 01 — Shared contract and fixtures

## Execution context (required)

- Work only from `~/r/p/podverse-custom-css-remote-file`
- Branch must be `feature/custom-css-remote-file`

## Objective

Lock a single remote custom-theme JSON contract and behavior rules used by both Podverse and Metaboost.

## Finalized remote JSON contract

### TypeScript contract (shared shape for both repos)

```ts
export type RemoteThemeLabelMap = Record<string, string>;

export interface RemoteTheme {
  id: string;
  cssVariables: Record<string, string>;
  labels?: RemoteThemeLabelMap;
}

export interface RemoteThemePack {
  version: string;
  themes: RemoteTheme[];
}
```

### Validation contract (must pass before custom themes are applied)

- Top-level:
  - `version` (string, required)
  - `themes` (array, required, at least 1)
- Theme item:
  - `id` (string, required, unique)
  - `cssVariables` (record of CSS custom property names to values, required)
  - `labels` (optional record of locale to display label)

### Additional validation constraints (locked)

- `id` must be non-empty after trim.
- `cssVariables` must contain at least one key/value pair.
- Every `cssVariables` key must start with `--` (CSS custom property naming).
- Every `cssVariables` value must be a non-empty string.
- `labels` keys are locale tags (`en-US`, `es`, etc.) and values are non-empty strings.
- Unknown top-level keys are allowed and ignored for forward compatibility.
- If any required validation fails, treat the entire remote file as invalid.

## Behavior rules to lock

- Custom URL validation allows:
  - any `https://` URL
  - local HTTP only: `http://localhost` and `http://127.0.0.1`
- If URL configured and fetch/validation succeeds:
  - custom themes are included in allowed theme list
  - first custom theme is effective default
  - `NEXT_PUBLIC_DEFAULT_THEME` is ignored
- If URL configured but fetch/validation fails:
  - log/observe failure using existing app logging patterns
  - use built-in theme registry only
  - restore normal built-in default handling (`NEXT_PUBLIC_DEFAULT_THEME` behavior)
- If URL not configured:
  - existing built-in behavior remains unchanged

## Precedence matrix (explicit)

### Case A: URL not configured

- Input:
  - custom URL: not set
  - `NEXT_PUBLIC_SUPPORTED_THEMES`: existing behavior
  - `NEXT_PUBLIC_DEFAULT_THEME`: existing behavior
- Output:
  - allowed theme list: built-in only
  - default theme: existing built-in logic

### Case B: URL configured and fetch + validation succeed

- Input:
  - custom URL: set and valid URL policy
  - remote JSON: valid and non-empty `themes`
  - `NEXT_PUBLIC_SUPPORTED_THEMES`: may be set or unset
  - `NEXT_PUBLIC_DEFAULT_THEME`: may be set or unset
- Output:
  - allowed theme list: built-in themes + custom themes from remote JSON
  - default theme: first theme in remote JSON array
  - `NEXT_PUBLIC_DEFAULT_THEME`: ignored

### Case C: URL configured and fetch/validation fails

- Input:
  - custom URL: set
  - fetch error OR schema validation failure OR empty/invalid theme entries
- Output:
  - allowed theme list: built-in only
  - default theme: built-in default handling (`NEXT_PUBLIC_DEFAULT_THEME` behavior restored)
  - observability: log the failure using existing logger/error patterns (no silent fallback)

## Fixture strategy (locked)

### Fixture files to create in each repo

- `tools/test-assets/assets/themes/custom-themes.multi.json`
  - 2+ themes
  - includes locale labels (`en-US`, `es`) for selector display testing
- `tools/test-assets/assets/themes/custom-themes.minimal.json`
  - exactly 1 theme
  - minimal valid shape (`version`, one `themes` item with `id` + `cssVariables`)
- `tools/test-assets/assets/themes/custom-themes.invalid.json`
  - intentionally invalid (schema violation) for negative-path fallback tests

### Canonical URLs (local HTTP)

When running `npm run start -w podverse-test-assets`, fixtures are served at:

- `http://localhost:2111/themes/custom-themes.multi.json`
- `http://localhost:2111/themes/custom-themes.minimal.json`
- `http://localhost:2111/themes/custom-themes.invalid.json`

### Local, Docker, and K8s usage

- Local host development:
  - sidecars can use `http://localhost:2111/themes/...` directly.
- Local Docker compose:
  - existing socat forwarding keeps `localhost:2111` reachable from app containers, so same URLs work.
- K8s / remote environments:
  - host equivalent JSON at an HTTPS URL with the same contract.
  - local HTTP exceptions (`localhost` / `127.0.0.1`) are for local dev/E2E only.

## Implementation notes for downstream prompts

- Prompt 2 (Podverse) and Prompt 3 (Metaboost) must consume this exact contract and precedence matrix without divergence.
- Prompt 4 (E2E matrix) must include coverage for all three fixture files.
- Prompt 5 (abcmemory/doc sync) should include a guardrail that fixture/theme examples stay aligned when CSS variable catalogs change.

## Exit criteria

- Contract schema and precedence rules are explicit and unambiguous.
- Fixture shapes are defined for local, Docker, and K8s flows.
- Both repo plans can reference the same contract without divergence.
