# Legal consent minimal — summary

## Status

**Ready to defer.** Implementation-ready plan-set for minimal legal UX on
`apps/web` only. Execute phases in order via [`COPY-PASTA.md`](./COPY-PASTA.md).

## Goals

- Three **separate** agreements: ToS (account), cookie consent (device),
  listen-stats opt-in (account).
- Cookie consent banner with three choices: **Accept all**, **Features
  only**, **Essential only** — env-gated, default **disabled**.
- Account-level ToS acceptance at signup + blocking re-accept modal on
  version bump.
- Updated minimal `/terms` i18n with prominent `{legal_name}` and
  `{retention_days}` for stats auto-delete.
- Gate Cloudflare Web Analytics on cookie consent (`choice === 'all'`).
- Configurable stats event retention via `STATS_TRACK_EVENT_RETENTION_DAYS`.

## Primary decisions (locked)

| Topic | Decision |
| --- | --- |
| Cookie consent storage | Device (`local-settings` cookie `cc` field) |
| ToS + listen-stats storage | Account (DB) |
| Cookie banner default | Off (`NEXT_PUBLIC_COOKIE_CONSENT_BANNER_ENABLED` unset/false) |
| Listen-stats default at signup | On (`allow_listen_stats` default true) |
| Third cookie option label | **Essential only** |
| management-web | Out of scope v1 |

## Key files (when implemented)

- API: `apps/api/src/controllers/account/`, stats controllers
- Web: `apps/web/src/components/Banner/CookieConsentBanner.tsx`,
  `apps/web/src/components/Modal/ModalTermsAcceptance.tsx`,
  `apps/web/src/app/terms/page.tsx`
- ORM: `packages/orm/src/entities/account/accountTermsAcceptance.ts`
- Migrations: `0032_account_terms_acceptance.sql`,
  `0033_account_settings_listen_stats.sql`
- Workers: `apps/workers/src/commands/stats/statsUpdateAggregated.ts`

## Out of scope (v1)

- management-web banners
- Full CMP vendor
- Separate `/privacy` page
- Changing `trackStats` entitlement (keep as abuse gate; add user preference)

## Verification (after full implementation)

```bash
./scripts/nix/with-env npm run openapi:check
./scripts/nix/with-env npm run test:e2e:api
make e2e_test_web_report_spec SPEC=e2e/cookie-consent-disabled.spec.ts
make e2e_test_web_report_spec SPEC=e2e/cookie-consent-enabled.spec.ts
make e2e_test_web_report_spec SPEC=e2e/sign-up-legal-consent.spec.ts
make e2e_test_web_report_spec SPEC=e2e/terms-version-acceptance.spec.ts
```

Push GitOps env changes to the Argo CD–tracked branch after k8s edits.
