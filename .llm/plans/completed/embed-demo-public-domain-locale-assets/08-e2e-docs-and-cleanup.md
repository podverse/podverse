# Phase 08 — E2E, docs, and cleanup

## Tasks

1. Update [`embed-demo-index.spec.ts`](../../../apps/web/e2e/embed-demo-index.spec.ts) — locale cookie smoke for `es`.
2. Update [`embed-routes.spec.ts`](../../../apps/web/e2e/embed-routes.spec.ts) if titles change for en-US.
3. Update [`docs/features/EMBED-PLAYER.md`](../../../docs/features/EMBED-PLAYER.md).
4. Retire or redirect [`generate-embed-media-fixtures.ts`](../../../tools/test-assets/src/generate-embed-media-fixtures.ts).

## Verification

```bash
npm run lint
npm run test:unit
make e2e_seed_web
make e2e_test_web_report_spec SPEC=e2e/embed-routes.spec.ts
make e2e_test_web_report_spec SPEC=e2e/embed-demo-index.spec.ts
```
