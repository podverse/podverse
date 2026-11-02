**Cursor model:** Opus 5.5 · **Reasoning:** high

# 04 — Distinct exit code for bad config, and a test that every k8s workload gets the env it needs

## Rows

R4, R6

## Runs after

03 (this plan's test must pass against 03's narrower Add by RSS category)

## Problem

Three nightly purge CronJobs on alpha failed at startup for weeks on a missing env var, and nobody
knew. Two gaps:

1. **Not noticed.** A config failure exits with code 1, the same as any runtime error, so an alert
   cannot say "this job is misconfigured" as opposed to "this job hit a bad row". The alerting set
   (`cron-health-alerting`) adds a rule on a dedicated exit code; this plan makes the apps emit it.
2. **Not prevented.** Nothing checks, before deploy, that the ConfigMaps and Secrets a CronJob or
   Deployment mounts supply every env var its command validates at startup.

## Contract (shared with the `cron-health-alerting` set)

- Exit code **78** (`EX_CONFIG` from sysexits) means "startup configuration is missing or invalid".
  Nothing else exits 78. The alert rule `PodverseStartupConfigInvalid` in
  `infra/k8s/base/monitoring/podverse.rules.yaml` matches on it.

## Decisions

1. **Exit code.** In `apps/workers/src/index.ts` and `apps/management-api/src/index.ts`, when
   `validateStartupRequirements` (or the `assertConfigValid` calls that follow it in workers) fails,
   log as today and exit **78**. Every other failure keeps exit 1. Put the constant in one place
   per app (for example `EXIT_CODE_CONFIG_INVALID = 78` in each app's `lib/startup/`), not a shared
   package, since only these two entry points use it. Check `apps/api/src/index.ts`: if its startup
   validation exits the same way, apply the same change there for consistency; say what you did.
2. **Env contract test** (workers unit tier). A test reads the committed manifests and fails when a
   workload's command needs an env var that none of its mounted sources provide:
   - **Workloads:** every `CronJob` in `infra/k8s/base/cron/` and `infra/k8s/base/ops/`, and every
     `Deployment` in `infra/k8s/base/workers/`, whose container runs
     `apps/workers/dist/index.js <command>`. Read the command name from `args`/`command`.
   - **Required vars:** reuse the workers startup code. Export from
     `apps/workers/src/lib/startup/` a pure function that returns the required env var names for a
     command (categories from `categoriesForCommand.ts` → required keys per validator). If the
     validators only push results today, refactor them so the key list and the check share one
     source; do not duplicate the key lists in the test.
   - **Provided vars:** union of
     - `configMapRef` / `configMapKeyRef` sources: keys from the kustomize `configMapGenerator`
       `envs`/`files` in the matching base (`infra/k8s/base/**/kustomization.yaml` and
       `source/*.env`).
     - `secretRef` / `secretKeyRef` sources: key names from the secret generator in
       `infra/k8s/scripts/secret-generators/` that creates that Secret name (the scripts use
       `--from-literal=KEY=`). If mapping a Secret name to its script is unreliable, add
       `infra/k8s/scripts/secret-generators/secret-keys.json` (Secret name → key names; names
       only, never values) plus a test that each listed key appears in its script.
     - Literal `env:` entries on the container.
   - Keys that are optional in validation are not required by the test.
   - The test message names the workload, the command, and each missing key.
3. **management-api cron:** `management-api-admin-session-purge` runs the management-api image.
   Cover it the same way if management-api exposes a per-command required-key list; if it validates
   one fixed set for every start, assert that set against that CronJob's sources in a
   management-api unit test instead. Say which you did.
4. The test must pass on the tree after plan 03. If it finds other real gaps, fix the manifest
   (mount the missing source) only when the command truly uses the key; otherwise narrow the
   validation like plan 03 did. List every finding in the final message.

## Files

- `apps/workers/src/index.ts`
- `apps/workers/src/lib/startup/validation.ts` (key-list export; coordinate with 03's edits)
- `apps/workers/src/lib/startup/exitCodes.ts` (new, or the name you choose)
- `apps/workers/src/lib/startup/k8sEnvContract.test.ts` (new)
- `apps/management-api/src/index.ts`
- `apps/management-api/src/lib/startup/` (exit code constant; contract test if decision 3 applies)
- `apps/api/src/index.ts` (only per decision 1)
- `infra/k8s/scripts/secret-generators/secret-keys.json` (only if decision 2 needs it)
- `apps/workers/ENV.md`, `apps/management-api/ENV.md` (one line each on exit code 78)

Do not edit `infra/k8s/base/cron/*.cronjob.yaml` or `infra/k8s/base/ops/*` except to mount a truly
missing source (decision 4); the `cron-health-alerting` set edits those files in parallel.

## Tests

- The contract test itself.
- A unit test that a failed startup validation exits 78 (mock `process.exit`).

## Release scratchpad

Surfaces: workers, management-api (and api if changed). Startup config failures now exit with
code 78 instead of 1, so alerting can report misconfigured jobs separately. A new workers unit
test fails when a CronJob or worker Deployment does not mount an env var its command requires.
