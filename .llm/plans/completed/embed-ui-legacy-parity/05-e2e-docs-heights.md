# 05 — E2E, docs, heights

## Objective

Encode the legacy visual contract in tests and docs.

## File targets

- `apps/web/e2e/helpers/embedAssertions.ts`
- `apps/web/e2e/embed-routes.spec.ts`
- `docs/features/EMBED-PLAYER.md`

## Changes

1. `EMBED_SINGLE_SHELL_HEIGHT` = 260, `EMBED_LIST_SHELL_HEIGHT` = 720.
2. Add `expectEmbedPlayerProgressVisible` (slider role or controls testid + times).
3. Update height step labels in `embed-routes.spec.ts`.
4. Update docs iframe snippet heights.

## Acceptance criteria

- E2E constants match `buildEmbedIframeCode.ts`.
- Progress visibility asserted on audio embed routes.

## Operator verification

```bash
make e2e_test_web_report_spec SPEC=e2e/embed-routes.spec.ts,e2e/embed-demo-index.spec.ts
```
