# 05 — Verification and follow-ups

## Goal

Verify builds, document follow-ups, update LLM history.

## Prompt

- Run from repo root (Nix wrapper as needed):
  - `npm run lint -w @podverse/ui -w @podverse/web -w @podverse/management-web`
  - `npm run type-check -w @podverse/ui -w @podverse/web -w @podverse/management-web`
  - `npm run test -w @podverse/ui`
- Targeted management-web E2E (storage):  
  `make e2e_test_management_web_report_spec SPEC=e2e/storage-superuser-crud.spec.ts,e2e/storage-permissions.spec.ts,e2e/storage-disabled.spec.ts`
- Update `.llm/history/active/shared-ui-convergence/` with session notes and files touched.

## Done when

- Commands above are green locally (or documented blockers); history file updated.
