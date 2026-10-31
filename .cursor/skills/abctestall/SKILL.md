---
name: abctestall
description: Run unit tests, API integration, web Playwright, and iOS Maestro from lightest to heaviest. Do not run Android. Fix clear failures, leave them unstaged, and defer unclear ones. Use when the operator runs /abctestall or says abctestall, and in every step of an abctestall plan-runner run.
---

# `abctestall`

For the fast tiers plus only a web and iOS startup-and-player check, use **abcsmoketest**.

## When the operator invokes it

Do not run tests in that chat. The sweep runs under plan-runner: one fresh agent per step, one
step at a time, each on Cursor Grok 4.7 at the reasoning its template line names, with Fast off.
Reply with the command, labeled **Root**:

```bash
./scripts/abctest/run.sh all
```

Tell the operator, briefly:

- First time on a computer: `npm --prefix ../plan-runner install`, then
  `node ../plan-runner/run-plan-set.mjs --login`.
- In **Mobile E2E Metro**, leave `npm run mobile:dev:e2e` running before the command. The command
  exits until port 8081 is that E2E bundle. It does not reach a later step while Metro is down.
- When the run pauses, fix the cause and continue the same agent:
  `./scripts/abctest/run.sh all --resume 'What you changed.'`
- Progress prints in the terminal. Each step's final message is saved in
  `.artifacts/plan-runner/<set>/`; the Close step's message is the summary.

The steps are in [all-COPY-PASTA.md](/.cursor/prompts/abctest/all-COPY-PASTA.md). The script copies
that template into a fresh set under `.llm/plans/active/` in this checkout and continues an open
run instead of starting a second one.

This sweep stays in the current checkout on the current branch. Do not create a git worktree and
do not move the plan set.

The rest of this skill is what each runner step follows.

## Runner steps

A step runs only the tier or areas its prompt names, from the monorepo root. This step overrides
the usual "do not run tests during agent work" rule for those commands.

- Stay in this checkout on the current branch. Do not create a git worktree. Do not run `git add`,
  `git commit`, or `git push`. Leave every product and test fix unstaged.
- Read the previous step's final message in `.artifacts/plan-runner/<set>/` first, for services
  already started and notes for later steps.
- A test failure never blocks the run. Fix what is clear, defer the rest as § Failures describes,
  and finish with `RUNNER-STATUS: DONE`. This replaces the runner's "stop after two failed
  rounds" instruction for this run.
- Report `RUNNER-STATUS: BLOCKED` only when the tier cannot run at all and only the operator can
  fix it: Docker is not running, Mobile E2E Metro is missing or is not the E2E bundle, a Maestro
  exit **78**. Say exactly what the operator must do.
- End with notes for later steps: services you started and their ports, fixes that touched shared
  code, and entries you deferred.

## Order

Tiers run lightest first. A tier is finished, including fixes and deferred entries, before the
next step starts.

1. **Unit** (packages and apps except API, management-api, and mobile): `npm run test:unit`
2. **Mobile unit**: `npm --prefix apps/mobile run test`
3. **API and management-api integration**: `npm run build:packages`, `make test_deps`, then
   `npm run test:e2e:api`. Start Postgres and Valkey only when `:5732` and `:6679` are not
   already healthy.
4. **Web and management-web Playwright**: API integration already ran in tier 3, so run the
   Playwright variants directly in this order: web, web Cloudflare, web cookie-consent, web
   signup, web custom-themes native, remote, and combo, management-web, management-web
   Cloudflare, management-web storage-enabled. Each variant needs `make test_deps` and the
   matching seed. Build packages before the first variant.
5. **iOS Maestro**, one flow file at a time (§ iOS Maestro). Do not run Android.

Static checks (`lint`, `type-check`, `openapi:check`, `i18n:validate`, `build`), workers broker
integration, and Android are not part of this sweep.

## iOS Maestro

Do not use `mobile:e2e:test:all`. Do not run Android: never pass `--platform android`, never run
`mobile:e2e:android`, and never install the Android E2E binary.

Before the first flow of a step:

- Mobile E2E Metro must already serve `:8081`. `./scripts/abctest/run.sh` checks that before any
  step starts. Confirm the listener's process tree includes `scripts/mobile/dev-e2e.sh`;
  environment variables do not show in `ps`. When `:8081` is free or held by the plain
  `npm run mobile:dev`, report BLOCKED and ask the operator to stop **Mobile Metro** and start
  `npm run mobile:dev:e2e` in **Mobile E2E Metro**. Do not stop an operator-owned Metro, and do
  not start Metro from the step; it would not outlive the agent.
- Run `make mobile_e2e_deps` once per run. Start **Mobile E2E API** with
  `npm run mobile:e2e:api:bg` and **Mobile E2E test-assets** with
  `npm run mobile:e2e:test-assets:bg` when they are not healthy. Both detach and survive the step.
- Install with `npm run mobile:e2e:ios` when the E2E binary is missing.

Run each flow with:

```bash
npm run mobile:e2e:test -- --platform ios <area>
```

Areas come from the iOS list in [HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md) § Complete area
list; each step names its letter range. The last iOS step also runs every other
`apps/mobile/e2e/*.yaml` phone flow the list does not name. `tablet` stays opt-in and last, only
when the E2E iPad is already available: `npm run mobile:e2e:ios:tablet` then
`npm run mobile:e2e:test -- --platform ios tablet`. If the tablet device or binary is missing,
defer that one flow and do not block on it.

A Maestro exit **78** invalidates that flow's result. Record it as an environment block in the
deferred file and report BLOCKED. Do not start the next flow on a device that failed to recover.

## Services

The operator may have nothing running. Inspect listeners before starting anything. Start only
what the tier needs, in a background shell, and do not kill an unidentified or operator-owned
process. Do not create a second Metro, API, or test-assets process when the right one is already
healthy.

## Failures

Work one failing unit at a time: one Vitest file or workspace, one Playwright spec, or one
Maestro YAML. Read the failure before editing. Fix the test or the product code when the cause
is clear, then rerun the narrowest command that covers that unit.

Do not raise timeouts, add retries, weaken assertions, or accept several outcomes as the first
response. Follow **abce2etestdebug** for how to read one E2E failure, and **mobile-test-economics**
for the two-hypothesis limit on a device assertion.

When the fix is not clear, stop changing that unit. Append an entry to
`.llm/plans/active/abctestall-deferred.md` (create the file on the first deferral) and continue
the tier. When an entry for the same test already exists, update it instead of adding another.
Each entry names the command, the assertion or error, what you tried, the competing
explanations, and what the operator would need to decide. Write it while the evidence is in
hand.

## Done

The Close step summarizes the run from every step's final message: passes per tier, fixes (file,
cause, rerun command, result), and deferred entries. Do not describe a tier as green when a
post-fix rerun has not actually passed.

**abctestdeferred** works the deferred file later. It resolves each entry, removes the entry
after a passing rerun, and deletes the file when none remain.
