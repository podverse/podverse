**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 13 — Catalog settings: one source for web, API, and workers

Deliver the three catalog settings to the web sidecar, the API, and the workers from one place,
so an operator cannot set the web and the API differently by accident. In k8s that place is one
shared ConfigMap, `podverse-catalog-config`, in `base/common`. In local dev it is one override
file, `catalog.env`. Plans 10 and 12 make each app read and validate the keys; this plan only
mounts and writes them, and adds a contract test that the workers that read them receive them.

## Rows

R2, R3, R14

## Runs after

12

## Files

- infra/k8s/base/common/kustomization.yaml
- infra/k8s/base/common/source/catalog/catalog.env
- infra/k8s/base/api/deployment.yaml
- infra/k8s/base/web/deployment.yaml
- infra/k8s/base/cron/worker-dead-feeds-merge.cronjob.yaml
- infra/k8s/base/cron/worker-recent-feeds.cronjob.yaml
- infra/k8s/base/cron/worker-scheduled-jobs.cronjob.yaml
- infra/k8s/base/ops/mq-rss-add-trending-podcast-index-1000.cronjob.yaml
- infra/k8s/base/ops/mq-rss-add-trending-podcast-index-50.cronjob.yaml
- infra/k8s/base/ops/seed-embed-demo-showcase-feeds.cronjob.yaml
- infra/k8s/base/workers/listener-live.deployment.yaml
- infra/k8s/base/workers/parser-add-by-rss-ondemand.deployment.yaml
- infra/k8s/base/workers/parser-add-by-rss-ondemand-background.deployment.yaml
- infra/k8s/base/workers/parser-live.deployment.yaml
- infra/k8s/base/workers/parser-normal.deployment.yaml
- infra/k8s/base/workers/parser-ondemand.deployment.yaml
- infra/k8s/base/workers/parser-opml-import.deployment.yaml
- apps/workers/src/lib/startup/k8sEnvContract.test.ts
- infra/k8s/INFRA-K8S.md
- dev/env-overrides/local/catalog.env.example
- scripts/local-env/setup.sh
- docs/development/env/LOCAL-ENV-OVERRIDES.md
- release-notes/scratchpad.md

## Settled decisions

Transcribe these. Do not reopen them.

- **One ConfigMap, unprefixed keys.** `podverse-catalog-config` holds `CATALOG_MUSIC_DISABLED`,
  `CATALOG_ADD_BY_RSS_DISABLED`, and `CATALOG_PODCAST_INDEX_ID_ALLOWLIST`, blank in base. The API
  and the workers mount it as is. The web runtime-config sidecar mounts it with envFrom
  `prefix: NEXT_PUBLIC_`, so it receives `NEXT_PUBLIC_CATALOG_*` with the same values. The keys
  are not added to `podverse-api-config`, `podverse-workers-config`, or
  `infra/k8s/base/web/source/web-sidecar.env`, so there is no second copy to drift.
- **Narrowing an instance** is one `configMapGenerator` merge of `podverse-catalog-config` in the
  GitOps `common` overlay, the same way operators already merge `podverse-integrations-config`,
  then a restart of the API, web, and workers pods.
- **Which workers mount it.** Exactly the workloads whose command has `CATEGORY_CATALOG` (plan
  12: Parser or PodcastIndex category). Today that is the 13 workload files listed above. The
  contract test below keeps it that way when commands or workloads change.
- **Position in envFrom.** Directly after the workload's own app ConfigMap
  (`podverse-api-config` or `podverse-workers-config`); for the web sidecar, last. A later envFrom
  entry wins for a duplicate key, so a stale copy in an app ConfigMap cannot override it.
- **Local dev is one file.** `catalog.env` uses the unprefixed keys. `make local_env_setup`
  writes each key it defines to the API and workers env files as is, and to the web sidecar env
  files with `NEXT_PUBLIC_` in front. A key the file defines is authoritative, blank included,
  so clearing the allowlist there restores the full site. A key the file does not define leaves
  the app env files alone (the `.env.example` blanks from plans 10 and 12).

## k8s

### `infra/k8s/base/common/source/catalog/catalog.env` (new)

Unquoted values (**env-file-formatting**):

```text
# Instance catalog settings. Blank keeps the full site. Mounted unprefixed on the API and the
# workers that add feeds, and with NEXT_PUBLIC_ in front on the web runtime-config sidecar.
# "true" stops adding music and hides music navigation on web. Stored music stays.
CATALOG_MUSIC_DISABLED=
# "true" turns Add by RSS off on web and in the API.
CATALOG_ADD_BY_RSS_DISABLED=
# Comma-separated Podcast Index feed ids. Only these feeds are added; stored shows stay.
CATALOG_PODCAST_INDEX_ID_ALLOWLIST=
```

### `infra/k8s/base/common/kustomization.yaml`

- First-line comment becomes "Shared ingress/TLS plus cross-component ConfigMaps (integrations,
  extensions, catalog)."
- Add a generator after `podverse-extensions-config`:

```yaml
  - name: podverse-catalog-config
    envs:
      - source/catalog/catalog.env
```

### `infra/k8s/base/api/deployment.yaml`

In the main API container's `envFrom` (the one that also lists `podverse-api-opaque`; not the
init container near the top), add directly after the `podverse-api-config` entry:

```yaml
            - configMapRef:
                name: podverse-catalog-config
```

### `infra/k8s/base/web/deployment.yaml`

In the runtime-config sidecar container's `envFrom` (the one that lists
`podverse-web-runtime-config` and `podverse-integrations-config`; not the init container and not
the Next app container), add as the last entry:

```yaml
            - prefix: NEXT_PUBLIC_
              configMapRef:
                name: podverse-catalog-config
```

The Next app container does not mount it: the app reads catalog values from the sidecar's
`/runtime-config` response.

### Workers workloads (13 files)

In each file listed under `## Files` from `cron/`, `ops/`, and `workers/`, add directly after the
`podverse-workers-config` entry of the workers container's `envFrom`, matching that file's
indentation (CronJobs are indented four more spaces than Deployments):

```yaml
            - configMapRef:
                name: podverse-catalog-config
```

Workload to command, for checking:

| File | Command |
| --- | --- |
| cron/worker-dead-feeds-merge.cronjob.yaml | podcastIndexDeadFeedsFlagAndMerge |
| cron/worker-recent-feeds.cronjob.yaml | mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex |
| cron/worker-scheduled-jobs.cronjob.yaml | scheduledJobsRunDue |
| ops/mq-rss-add-trending-podcast-index-1000.cronjob.yaml | mqRSSAddTrendingPodcastsFromPodcastIndex |
| ops/mq-rss-add-trending-podcast-index-50.cronjob.yaml | mqRSSAddTrendingPodcastsFromPodcastIndex |
| ops/seed-embed-demo-showcase-feeds.cronjob.yaml | seedEmbedDemoShowcaseFeeds |
| workers/listener-live.deployment.yaml | mqRSSRunLiveItemListener |
| workers/parser-add-by-rss-ondemand.deployment.yaml | mqAddByRSSRunParser |
| workers/parser-add-by-rss-ondemand-background.deployment.yaml | mqAddByRSSRunParser |
| workers/parser-live.deployment.yaml | mqRSSRunParser |
| workers/parser-normal.deployment.yaml | mqRSSRunParser |
| workers/parser-ondemand.deployment.yaml | mqRSSRunParser |
| workers/parser-opml-import.deployment.yaml | mqOpmlImportRun |

If the contract test below names a workload that is not in this table, or this table has one it
does not need, follow the test: it reads `getCategoriesForCommand` from plan 12.

### `infra/k8s/INFRA-K8S.md`

- In the `base/common` bullet, add `podverse-catalog-config` (`source/catalog/`) to the list of
  shared ConfigMaps.
- Add a bullet after the built-in web integrations bullet: "Instance catalog settings:
  `podverse-catalog-config` from `base/common/source/catalog/catalog.env`, blank by default.
  Mounted on the API, on the workers that parse feeds or read Podcast Index, and on the web
  runtime-config sidecar with `prefix: NEXT_PUBLIC_`. To narrow an instance, merge the ConfigMap
  in your GitOps `common` overlay (`behavior: merge`) and restart the API, web, and workers
  pods. Keys and behavior: `apps/web/ENV.md`, `apps/api/ENV.md`, `apps/workers/ENV.md`."

## Local env

### `dev/env-overrides/local/catalog.env.example` (new)

`make local_env_prepare` copies every `*.env.example` in this directory to the home override
directory, so no script change is needed for that.

```text
#####
##### Instance catalog: Music, Add by RSS, Podcast Index id allowlist (API, workers, web sidecars)
#####
# Leave all three blank for the full site. make local_env_setup writes each key this file
# defines, blank included, as CATALOG_* into the API and workers env files and as
# NEXT_PUBLIC_CATALOG_* into the web sidecar env files, so every app reads the same value.
# "true" stops adding music and hides music navigation on web. Stored music stays.
CATALOG_MUSIC_DISABLED=
# "true" turns Add by RSS off on web and in the API.
CATALOG_ADD_BY_RSS_DISABLED=
# Comma-separated Podcast Index feed ids, for example 920666,41504.
CATALOG_PODCAST_INDEX_ID_ALLOWLIST=
```

### `scripts/local-env/setup.sh`

Directly after the `# From web-image.env` loop, add:

```bash
# From catalog.env: one value per setting for the API, workers, and web sidecars. A key the
# override defines is authoritative, so a blank value there restores the full site.
for v in CATALOG_MUSIC_DISABLED CATALOG_ADD_BY_RSS_DISABLED CATALOG_PODCAST_INDEX_ID_ALLOWLIST; do
	if [ -n "${!v+set}" ]; then
		for file in "${API_AND_WORKERS_ENV_FILES[@]}"; do
			upsert_var "$file" "$v" "${!v}"
		done
		for file in "${WEB_ENV_FILES_APP_AND_SIDECAR[@]}"; do
			upsert_var "$file" "NEXT_PUBLIC_$v" "${!v}"
		done
	fi
done
```

The script runs with `set -euo pipefail`; `${!v+set}` is safe under `-u`. `upsert_var` returns
early for a missing file and handles an empty value. Do not use `apply_override`: it skips blank
values, which would leave a stale allowlist after the operator clears the override. Use tabs, as
the rest of the file does.

### `docs/development/env/LOCAL-ENV-OVERRIDES.md`

Add a `catalog.env` row to the override table directly after the `brand.env` row: "API, workers, and web sidecars: optional
**`CATALOG_MUSIC_DISABLED`**, **`CATALOG_ADD_BY_RSS_DISABLED`**, and
**`CATALOG_PODCAST_INDEX_ID_ALLOWLIST`**; written as `CATALOG_*` to API and workers and as
`NEXT_PUBLIC_CATALOG_*` to web sidecars (`dev/env-overrides/local/catalog.env.example`). Blank
keeps the full site." Leave the cell unpadded if it overflows; Prettier is the operator's step.

## Tests

- `apps/workers/src/lib/startup/k8sEnvContract.test.ts`: import `getCategoriesForCommand` and
  `CATEGORY_CATALOG` from `./categoriesForCommand.js` (match the file's existing import style),
  and add one test inside the existing `describe`, after "mounts every env var each workers
  command requires":

  "mounts the catalog settings on every workers command that reads them" — for each workload
  whose `getCategoriesForCommand(commandName)` has `CATEGORY_CATALOG`, read its env with
  `readProvidedEnv`; collect a finding `${label} runs ${commandName} and does not mount: <keys>`
  for each of `CATALOG_MUSIC_DISABLED`, `CATALOG_ADD_BY_RSS_DISABLED`, and
  `CATALOG_PODCAST_INDEX_ID_ALLOWLIST` whose value is `undefined`; expect the findings to equal
  `[]`. Then assert the inverse with a second `expect`: `worker-account-session-purge`'s env
  does not contain `CATALOG_MUSIC_DISABLED`, so the mount stays limited to commands that read it.

  `readConfigMaps` already walks every `kustomization.yaml` under `infra/k8s/base`, including
  `base/common`, so the new generator is found without a helper change.
- No test reads the API or web deployment in this repo. The operator checks those two mounts by
  rendering the base (the last prompt of the set lists it):

```bash
kubectl kustomize infra/k8s/base/api | rg -n -A2 "podverse-catalog-config"
kubectl kustomize infra/k8s/base/web | rg -n -B1 -A2 "podverse-catalog-config"
```

## Release scratchpad

```markdown
## Instance catalog settings: one ConfigMap and one local override

- Surfaces: k8s base env, ops, local env overrides
- Change: new shared ConfigMap `podverse-catalog-config` in `infra/k8s/base/common` with blank
  `CATALOG_MUSIC_DISABLED`, `CATALOG_ADD_BY_RSS_DISABLED`, and
  `CATALOG_PODCAST_INDEX_ID_ALLOWLIST`. The API and the workers that parse feeds or read Podcast
  Index mount it; the web runtime-config sidecar mounts it with `prefix: NEXT_PUBLIC_`, so all
  three read the same values. Local dev sets all of them from one `catalog.env` override.
- Who notices: operators of self-hosted and GitOps deployments
- Operator steps: GitOps repos that pin `base/common` pick up the new ConfigMap on the next sync,
  with nothing to set. To narrow an instance, merge `podverse-catalog-config` in the `common`
  overlay and restart the API, web, and workers pods.
```
