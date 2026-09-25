---
name: abctestall
description: Run every Podverse monorepo test from lightest to heaviest, fix clear failures, and defer unclear ones. Use when the operator invokes abctestall.
---

# `abctestall`

Use this workflow when the operator invokes **`abctestall`**. Run every test in the Podverse
monorepo, lightest tier first and iOS Maestro last. The agent runs the commands and starts any
required services in its own background shells. This invocation overrides the usual
"do not run tests during agent work" rule.

## Order

Run from the monorepo root, through `./scripts/nix/with-env` when the shell has no repo Node.
Finish a tier, including fixes and deferred entries, before starting the next.

1. **Unit (packages and apps except API, management-api, and mobile)** — **Root**

   ```bash
   npm run test:unit
   ```

2. **Mobile unit** — **Mobile**

   ```bash
   npm --prefix apps/mobile run test
   ```

3. **API and management-api integration** — **Root**. Start Postgres and Valkey first if `:5732`
   and `:6679` are not already healthy (`make test_deps`).

   ```bash
   make test_deps
   npm run test:e2e:api
   ```

4. **Workers broker integration** — **Root**. The OPML import integration file skips unless
   `PODVERSE_RUN_MQ_INTEGRATION=1`. Start Artemis with `make test_deps_mq` (default host
   `:61616`, which is outside Maestro's reserved `5555–5683` range) before the gated run.
   Re-run only that file, not the whole workers unit suite.

   ```bash
   make test_deps_mq
   PODVERSE_RUN_MQ_INTEGRATION=1 npm run test -w apps/workers -- src/commands/mq/rss/runOpmlImport.integration.test.ts
   ```

5. **Web and management-web Playwright** — **Root**. `make e2e_test_report` is the full report
   suite (API integration again, then every web variant and management-web including Cloudflare).
   After it, run the storage-enabled management-web config, which that target does not include:

   ```bash
   make e2e_test_report
   make e2e_test_management_web_storage_enabled
   ```

   On a later invocation, skip the API half inside the report when step 3 already passed on this
   checkout and nothing in API or ORM has changed since. Run the Playwright variants directly in
   this order instead: web, web Cloudflare, web cookie-consent, web signup, web custom-themes
   native, remote, and combo, management-web, management-web Cloudflare, management-web
   storage-enabled. Each variant still needs `make test_deps` and the matching seed.

6. **iOS Maestro, one flow file at a time** — **Mobile Maestro**. Do not use
   `mobile:e2e:test:all`. Do not run Android.

   Prepare once: `make mobile_e2e_deps`, then leave-running **Mobile E2E Metro**
   (`npm run mobile:dev:e2e`), **Mobile E2E API** (`npm run mobile:e2e:api:bg`), and **Mobile E2E
   test-assets** (`npm run mobile:e2e:test-assets:bg`). Confirm health before the first flow.
   Install with `npm run mobile:e2e:ios` in **Mobile E2E iOS** when the E2E binary is missing.

   Run each top-level phone flow in the iOS command list in
   [HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md) § Complete area list:

   ```bash
   npm run mobile:e2e:test -- --platform ios <area>
   ```

   After that list, run any other `apps/mobile/e2e/*.yaml` phone flow the list does not name.
   `tablet` stays opt-in: run it last, only when the E2E iPad is already available, with
   `npm run mobile:e2e:ios:tablet` then `npm run mobile:e2e:test -- --platform ios tablet`.
   If the tablet device or binary is missing, defer that one flow and do not block the phone
   sweep on it.

Static checks (`lint`, `type-check`, `openapi:check`, `i18n:validate`, `build`) are not part of
this sweep.

## Services

The operator may have nothing running. Inspect listeners before starting anything. Start only
what the next tier needs, in a background shell, and do not kill an unidentified or
operator-owned process. Do not create a second Metro, API, or test-assets process when the
right one is already healthy.

## Failures

Work one failing unit at a time: one Vitest file or workspace, one Playwright spec, or one
Maestro YAML. Read the failure before editing. Fix the test or the product code when the cause
is clear, then rerun the narrowest command that covers that unit.

Do not raise timeouts, add retries, weaken assertions, or accept several outcomes as the first
response. Follow **abce2etestdebug** for how to read one E2E failure, and **mobile-test-economics**
for the two-hypothesis limit on a device assertion.

When the fix is not clear, stop changing that unit. Append an entry to
`.llm/plans/active/abctestall-deferred.md` (create the file on the first deferral) and continue
the sweep. Each entry names the command, the assertion or error, what you tried, the competing
explanations, and what the operator would need to decide. Write it while the evidence is in
hand.

A Maestro exit **78** invalidates that flow's result. Record it as an environment block in the
deferred file and stop the mobile queue. Do not start the next flow on a device that failed to
recover.

## Done

The sweep is finished when every tier has either passed or has its remaining failures listed in
the deferred file. Summarize passes, fixes (file, cause, rerun command, result), and deferred
entries. Do not describe a tier as green when a post-fix rerun has not actually passed.
