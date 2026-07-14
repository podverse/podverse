# Plan 01 — apiMobileE2e profile

Read and implement detail
[076-e2e-api-mobile-profile](/docs/proposals/mobile/_master-plan_/details/076-e2e-api-mobile-profile.md).

## Work

1. Extend `PodverseApiTestEnvProfile` with `apiMobileE2e` in
   [`packages/helpers-config/src/podverseTestEnv.ts`](/packages/helpers-config/src/podverseTestEnv.ts).
2. Override: `API_PORT=4230`, `API_PUBLIC_BASE_URL=http://localhost:4230`, same DB/Valkey base as
   other profiles, `PODVERSE_STARTUP_VALIDATION_SILENT` if needed for scripted start, CORS suitable
   for local mobile E2E.
3. Rebuild/export package surface if profiles are re-exported from `index.ts`.
4. Update [`apps/mobile/e2e/TEST-ENV.md`](/apps/mobile/e2e/TEST-ENV.md): document **4230** as the
   dedicated mobile E2E API port (not 4030/4132).

## Done when

```bash
rg -n 'apiMobileE2e|4230' packages/helpers-config/src/podverseTestEnv.ts apps/mobile/e2e/TEST-ENV.md
```

Mark master-plan step **5.17** and Appendix C **076** → `done`; detail header → `done`.
