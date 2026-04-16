# Deployment Artifact - local + npm

Date: 2026-04-16

## Executed Commands

```bash
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w @podverse/web
./scripts/nix/with-env npm run dev:web-sidecar
curl -sS "http://127.0.0.1:3001/runtime-config"
```

## Results

- `build:packages`: pass
- `build -w @podverse/web`: pass
- `dev:web-sidecar`: sidecar startup validation completed successfully, then process exited with `EADDRINUSE` on port `3001` (port already in use by existing process)
- `curl /runtime-config`: HTTP 200 response

## Runtime-Config Payload Excerpt (MetaBoost keys)

Observed payload from `http://127.0.0.1:3001/runtime-config` did not include:

- `NEXT_PUBLIC_APP_VALUE_METABOOST_STANDARD`
- `NEXT_PUBLIC_APP_VALUE_METABOOST_NODE`

This is consistent with sidecar behavior that omits empty values from output.

## Health Evidence

- Sidecar validation log showed `Failed: 0` and `Required Missing: 0`.
- Sidecar process bind failure was environmental (`EADDRINUSE`), not validation/config failure.

## MB1-Capable Initialization Scenario

- Build-time and sidecar validation paths initialize successfully with current env inputs.
- MetaBoost keys are currently unset in local npm sidecar env; MB1 runtime path is therefore not initialized in this environment snapshot.

## Status

- Partial readiness evidence captured.
- Follow-up needed to run on a free sidecar port and/or set explicit MetaBoost env values for MB1 runtime payload validation.
