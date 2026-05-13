# Phase 2 — Library decision and prototyping (placeholder)

## Expand later

- Compare `hls.js` vs alternatives (native-only where possible, MSE
  needs, error recovery).
- Decide dynamic-import chunk name and bundle budget.
- Prototype: attach/detach lifecycle on a throwaway branch; measure
  Safari native HLS path (no `hls.js` chunk fetch).

## Exit (when expanded)

Written ADR or matrix row documenting library choice + non-default
`Hls` config keys and why each exists.

## Verification (placeholder)

```bash
npm run lint -w apps/web
npm run build -w apps/web
```
