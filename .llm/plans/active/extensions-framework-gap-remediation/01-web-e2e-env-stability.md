# Phase 01 - web E2E env stability

Fix the apps/web Cloudflare head spec so it uses an account-signup mode that does not require unrelated mailer env variables.

## Required changes

- Update apps/web/e2e/extensions-cloudflare-head.spec.ts:
  - In both temporary sidecar and temporary web env objects, change NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE from admin_only_email to admin_only_username.
- Keep all extension-related env toggles unchanged.
- Keep spec intent unchanged:
  - Off context asserts zero Cloudflare scripts.
  - On context asserts one script with token payload.

## Validation

Run:

```bash
make e2e_test_web_report_spec SPEC=e2e/extensions-cloudflare-head.spec.ts
```

## Exit criteria

- Spec passes consistently without API bootstrap validation failures caused by signup mode.
- No behavior change to extension assertions.
