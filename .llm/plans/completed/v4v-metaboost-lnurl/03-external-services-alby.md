# 03 - external-services-alby Package

## Goal

Create `@podverse/external-services-alby` to encapsulate Alby Sandbox and LNURL integration in a way
that can be replaced by other payment services in the future.

## Target Repo

- `/Users/mitcheldowney/repos/pv/podverse`

## Package Location

- `packages/external-services-alby/`

## Tasks

1. **Package scaffolding**
   - Standard monorepo package layout.
   - ESM formatting and `"sideEffects": false`.

2. **Alby Sandbox integration**
   - Client for Alby Sandbox faucet.
   - Types for Sandbox responses and LNURL handles.

3. **LNURL utilities**
   - Helper to resolve LNURL pay endpoints.
   - Minimal fetch-based approach to avoid heavy deps.

4. **Service abstraction**
   - Interface for payment service adapters.
   - Alby implementation as first concrete adapter.

## Output

- Alby Sandbox functionality isolated in a dedicated package.

