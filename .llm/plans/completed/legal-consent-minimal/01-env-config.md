# Phase 1 — Env vars + runtime config + k8s

## Goal

Add configuration for terms version, legal name (web), cookie consent
banner toggle, and stats retention days. Default: cookie banner **off**.

## New environment variables

| Variable | Where | Default | Notes |
| --- | --- | --- | --- |
| `TERMS_OF_SERVICE_VERSION` | API | required when `ACCOUNT_SIGNUP_MODE=user_signup_email` | e.g. `2026-05-28` |
| `NEXT_PUBLIC_TERMS_OF_SERVICE_VERSION` | web sidecar | mirrors API | synced by `local_env_setup` |
| `NEXT_PUBLIC_LEGAL_NAME` | web sidecar | mirrors `LEGAL_NAME` | prominent on `/terms` |
| `NEXT_PUBLIC_COOKIE_CONSENT_BANNER_ENABLED` | web sidecar | empty/false | `"true"` to show banner |
| `STATS_TRACK_EVENT_RETENTION_DAYS` | workers | `30` | used in phase 7 |
| `NEXT_PUBLIC_STATS_TRACK_EVENT_RETENTION_DAYS` | web sidecar | mirrors workers | ICU in terms i18n |

## Files to update

### App env examples

- `apps/api/.env.example` — add `TERMS_OF_SERVICE_VERSION`
- `apps/web/sidecar/.env.example` — add four `NEXT_PUBLIC_*` keys (Legal
  section before existing brand keys per env-file-formatting skill)
- `apps/workers/.env.example` — add `STATS_TRACK_EVENT_RETENTION_DAYS`

### Config + validation

- `apps/api/src/config/index.ts` — `config.terms.version`
- `apps/api/src/lib/startup/validation.ts` — validate
  `TERMS_OF_SERVICE_VERSION` when signup email mode
- `apps/workers/src/config/index.ts` — `config.stats.trackEventRetentionDays`
- `apps/workers/src/lib/startup/validation.ts` — positive integer
- `apps/web/sidecar/src/server.ts` — include new keys in runtime-config
  optional/required lists
- `apps/web/src/config/runtime-config.ts` — key list
- `apps/web/src/config/index.ts` — expose:

```typescript
public: {
  legal: { name: string };
  terms: { version: string };
  stats: { trackEventRetentionDays: number };
  cookieConsent: { bannerEnabled: boolean };
}
```

- `apps/web/scripts/validate-env.ts` — validate new sidecar keys when
  banner enabled is not required (optional bool)

### Local env sync

- `scripts/local-env/setup.sh` — mirror:
  - `LEGAL_NAME` → `NEXT_PUBLIC_LEGAL_NAME`
  - `TERMS_OF_SERVICE_VERSION` → `NEXT_PUBLIC_TERMS_OF_SERVICE_VERSION`
  - `STATS_TRACK_EVENT_RETENTION_DAYS` →
    `NEXT_PUBLIC_STATS_TRACK_EVENT_RETENTION_DAYS`
- `dev/env-overrides/local/legal.env.example` — optional
  `TERMS_OF_SERVICE_VERSION` stub

### K8s (podverse monorepo)

- `infra/k8s/base/api/source/api.env`
- `infra/k8s/base/web/source/web-sidecar.env`
- `infra/k8s/base/workers/source/workers.env`
- `infra/config/env-templates/` stubs if applicable

### GitOps (k.podcastdj.com)

- `apps/podverse-alpha/common/source/` or web-sidecar env — mirror
  `NEXT_PUBLIC_COOKIE_CONSENT_BANNER_ENABLED=` (empty default)

## Exit criteria

- `getConfig().public.legal.name`, `.terms.version`,
  `.cookieConsent.bannerEnabled`, `.stats.trackEventRetentionDays` resolve
  in web dev with sidecar.
- API/workers startup validation passes with new vars set.
- Cookie banner remains off unless env explicitly `"true"`.

## Verification

```bash
./scripts/nix/with-env npm run lint
```

Manual: `curl localhost:4031/runtime-config | jq` shows new env keys when set.
