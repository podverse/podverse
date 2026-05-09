# Phase 05 - final verification and archive

Run the final verification matrix for this remediation plan, then archive the plan directory.

## Verification commands

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w apps/management-api
./scripts/nix/with-env npm run build -w apps/web
./scripts/nix/with-env npm run test:e2e:api
make e2e_test_web_report_spec SPEC=e2e/extensions-cloudflare-head.spec.ts
make e2e_test_management_web_report_spec SPEC=e2e/extensions-list-edit.spec.ts
```

## Archive step

Per plan-completion skill:

- Move .llm/plans/active/extensions-framework-gap-remediation/
- To .llm/plans/completed/extensions-framework-gap-remediation/

## Exit criteria

- Verification commands pass.
- Plan directory archived.
