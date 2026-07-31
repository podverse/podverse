# 02 — Wire API rate limits to env / config

## Goal

Replace hardcoded `windowMs` / `max` on API HTTP rate limiters with values from env (via config),
using the helper from 01. Keep current defaults. Document every knob in `apps/api/.env.example`
and `infra/k8s/base/api/source/api.env`.

## Scope

All `rateLimitEndpoint` / `rateLimitAuthEndpoint` call sites under `apps/api` listed in
`00-SUMMARY.md` (auth login, account routes, OPML import enqueue in controller, add-by-RSS parse
enqueue, MQ RSS on-demand middleware, chapters-transcript).

## Steps

1. Extend `apps/api/src/config/index.ts` with a `rateLimits` (or similarly named) section. Each
   entry is `{ windowMs, max }` from `parseCountPerWindowEnv…` with the defaults in
   `00-SUMMARY.md`. Follow existing optional-int style (IIFE / helper; validated at startup).
2. Add matching keys to `apps/api/src/lib/startup/validation.ts` as **optional** (default message
   should cite the numeric default, e.g. `Use Default (10)`). Keep section grouping sensible
   (Auth / Account / OPML / Add-by-RSS / MQ). Follow **startup-validation-env-order**.
3. Update call sites to read from `config`:
   - `apps/api/src/routes/auth.ts` — login (`AUTH_LOGIN_MAX_PER_MINUTE`; keep test-env raise if
     still needed via `config.nodeEnv === 'test'` **or** higher default only in
     `podverseTestEnv` — prefer raising via test env profile when practical).
   - `apps/api/src/routes/account.ts` — create, email flows, download-data, opml export,
     chapters-transcript.
   - `apps/api/src/controllers/account/accountOpmlImport.ts` —
     `ACCOUNT_OPML_IMPORT_ENQUEUE_MAX_PER_HOUR`.
   - `apps/api/src/controllers/account/accountAddByRSSParse.ts` —
     `ACCOUNT_ADD_BY_RSS_PARSE_ENQUEUE_MAX_PER_HOUR`.
   - `apps/api/src/controllers/mq/mq.ts` — `MQ_RSS_ON_DEMAND_MAX_PER_HOUR`.
4. Add all keys (with quoted defaults) to `apps/api/.env.example` under a clear
   `##### Rate limits #####` section. Match **env-file-formatting** (double quotes for
   non-empty values). Keep `OPML_IMPORT_MAX_FEEDS_PER_HOUR` in its existing OPML section (soft
   cap) and add a short comment distinguishing it from the HTTP enqueue max.
5. Mirror the same keys/defaults into `infra/k8s/base/api/source/api.env` (one var per comment
   line for K8s source env).
6. Update `packages/helpers-config/src/podverseTestEnv.ts` only if tests need higher limits
   (e.g. login burn already assumes raised test max — keep that behavior).
7. Adjust any API integration tests that hardcode assumptions about windows if needed; do **not**
   implement the deferred HTTP 429 burn-in plan here (that remains
   `opml-test-hardening/01-http-429-burn-in.md`), but ensure wiring does not break existing
   account/auth rate-limit tests.
8. Brief note in `apps/api/ENV.md` (or equivalent) listing the new optional rate-limit vars.

## Key files

- `apps/api/src/config/index.ts`
- `apps/api/src/lib/startup/validation.ts`
- `apps/api/src/routes/auth.ts`, `apps/api/src/routes/account.ts`
- `apps/api/src/controllers/account/accountOpmlImport.ts`
- `apps/api/src/controllers/account/accountAddByRSSParse.ts`
- `apps/api/src/controllers/mq/mq.ts`
- `apps/api/.env.example`
- `infra/k8s/base/api/source/api.env`
- `packages/helpers-config/src/podverseTestEnv.ts` (if needed)
- `apps/api/ENV.md` (if present / maintained)

## Out of scope

- `rate-limit.env` home override (plan 04)
- Workers soft-cap config object (plan 03)
- Changing default numeric values

## Operator verification

```bash
# Root
npm run build:packages
npm run build -w apps/api
# After make test_deps if needed:
npm run test -w apps/api -- src/test/auth.test.ts src/test/account.test.ts src/test/opml-import.test.ts
```
