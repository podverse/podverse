---
name: abcdeploysteps
description: When the operator runs /abcdeploysteps or says abcdeploysteps, plus a repo and an environment (abcdeploysteps podverse alpha), check deploy blockers and, if alpha is clear and there is something to ship, write a local step-by-step deploy checklist. Use only for that keyword, and only when the repo word is podverse.
---

# `abcdeploysteps`

The operator is asking for a deploy checklist, not for the agent to deploy. Investigate, warn,
and write the steps. Do not run publish, push, EAS, Argo, or kubectl apply.

`abcdeployrun` is a different command. It runs the alpha server deploy. The refusals in this
skill apply only when the operator said `abcdeploysteps`.

## The repo and the environment are required

`abcdeploysteps` is three words. The second word is the repo. The third word is the environment.

- `abcdeploysteps podverse alpha`
- `abcdeploysteps podverse beta`
- `abcdeploysteps podverse production`

This skill applies only when the repo word is `podverse`. `abcdeploysteps metaboost …` belongs to
the Metaboost repo's skill. Do not write a Podverse checklist for it, and do not add Metaboost
steps here.

If the repo word or the environment word is missing, ask for both and stop. Do not infer the repo
from the open workspace. Do not assume alpha.

## What the names mean right now

Only **alpha** is in use. Beta and production are real words for later. They are not aliases for
alpha.

| Word         | Right now                                                                 |
| ------------ | ------------------------------------------------------------------------- |
| `alpha`      | The live preprod cluster and the Podverse Next store app. See below.      |
| `beta`       | No cluster and no GitOps overlay. Stop.                                   |
| `production` | No production cluster. Stop. Do not promote `main` or use EAS production. |

**Alpha, server.** GitOps namespace `podverse-alpha` in the `k.podcastdj.com` checkout. Argo CD
tracks that repo's `main` branch. Public hosts:

- `https://alpha.podcastdj.com` (web)
- `https://api-alpha.podcastdj.com` (API)
- `https://management.alpha.podcastdj.com` (management web)
- `https://management-api.alpha.podcastdj.com` (management API)

**Alpha, mobile.** Podverse Next, bundle id `com.podverse.app.next`. Store builds use EAS profile
`beta` (the EAS `preview` environment). That is the alpha binary. It is not the old Podverse store
listing, and it is not `PROFILE=production`.

When the operator says this meaning has changed, update this skill before writing another
checklist.

`make alpha_*` in the Podverse repo is a **local Docker** alpha. It does not deploy
`alpha.podcastdj.com`. Never put those targets in an alpha checklist.

## Stop before writing a checklist

Write the temp file only when alpha is clear **and** at least one surface below has changes since
its last deploy. Otherwise say why and stop. Do not write a partial file that skips the warning.

### Hard stops

- Environment is `beta` or `production`. Say those environments are not stood up. Do not draft a
  promote-to-`main` or `PROFILE=production` run from this keyword.
- Nothing to ship (see **What changed**).
- Dirty worktree on Podverse (`git status --porcelain`). The staging sync and store builds refuse
  or prompt. List the paths. Commit or stash is the operator's step. Stop so the checklist is not
  written against unknown files.
- `release-notes/scratchpad.md` is missing or not empty. Tell the operator to run
  **abcreleasenotes**, commit that on `develop`, then say `abcdeploysteps podverse alpha` again.
- `release-notes/<X.Y.Z>.md` is missing or empty for the root `package.json` version. The staging
  sync refuses. Same for `release-notes/mobile/<X.Y.Z>.md` when mobile will build.
- `staging` is not a fast-forward ancestor of `develop`. Do not suggest a force push.
- The commits need a database wipe, a migration squash reload, a PVC delete, or a namespace
  teardown. Say so and wait. Do not put those commands in the file unless the operator confirms
  that wipe in this conversation. A new `NNNN_*.sql` under `linear-migrations/` is not a wipe.
  It is a migrate job in the checklist (**Pending migrations**).
- `gh auth status` is not logged in. The sync script needs it.
- The checklist would change the bundle id, ship EAS Update, or point a binary at the old Podverse
  store listing.

A docs-only, test-only, or `.cursor/`-only diff is nothing to ship.

### Warn, and leave the step out until they agree

These are significantly inadvisable on a routine alpha deploy. Name them and do not include them
unless the operator explicitly wants that step in this conversation:

- `./scripts/publish/bump-version.sh` (it rewrites every workspace version, pushes `develop`, and
  bypasses hooks). The next `X.Y.Z-staging.N` is chosen by **Publish (staging)** from the current
  base version. Do not bump just to deploy.
- `./scripts/publish/sync-staging-to-main.sh` or any `main` promote. That publishes production GHCR
  tags (`X.Y.Z` and `:latest`). Alpha pins stay on `X.Y.Z-staging.N`.
- `PROFILE=production`, or `make mobile_eas_env_set` (changes the URLs baked into later builds).
- Pinning GitOps to a tag that does not exist yet.
- Editing third-party image tags (Postgres, Valkey, ActiveMQ) while bumping Podverse.
- Deleting `db-data-podverse-db-0` or running `apps/podverse-alpha/scripts/ops/reset-alpha-db.sh`.
- A second paste in the same block as an EAS `build` or `submit`. Those commands read the next
  line as the prompt answer. A blank line is "no" and cancels the build.

## What changed

Last **server** deploy is the immutable tag pinned in `k.podcastdj.com`, not floating `:staging`.
Read `?ref=` under `apps/podverse-alpha/` (every Podverse base ref is the same tag). Compare:

```bash
git fetch origin
git log --oneline <pinned-tag>..origin/develop
```

If the pinned value is not a real tag (`git rev-parse --verify '<pinned>^{commit}'` fails, for
example a literal `5.5.3-staging.N`), the pin was committed with a placeholder. Say so, compare from
the last real tag in `k.podcastdj.com` `git log -- apps/podverse-alpha`, and have the pin step
replace that placeholder.

Split that log:

- **Server** — anything that ships in GHCR images or in `infra/k8s/base/` (apps other than mobile,
  packages, Dockerfiles, Kustomize bases). This includes a base-manifest change with no app code
  change, because GitOps `?ref=` is that tag.
- **Mobile** — `apps/mobile/` and the workspace packages `apps/mobile/package.json` depends on.
  The last mobile deploy is the git commit on the newest finished EAS `beta` build for that
  platform, not the cluster pin. `make mobile_eas_ios_list` and `make mobile_eas_android_list`
  are read-only. If they fail, say mobile is unconfirmed and ask. Do not guess that mobile must
  ship.

Omit a lane whose paths did not change. Say that in the reply.

### Pending migrations

Run this before the checklist file exists. A server checklist with no `Migrations:` line is
incomplete. Do not guess `none`.

From the Podverse repo, files added since the pin:

```bash
git diff --name-only <pinned-tag>..origin/develop -- infra/k8s/base/ops/source/database/linear-migrations/app infra/k8s/base/ops/source/database/linear-migrations/management
```

That diff is not the whole check. `ops-db-migrate-app` and `ops-db-migrate-management` are
suspended CronJobs. Syncing ops does not apply SQL to a database that already exists.
`ops-db-bootstrap-migrations` runs once, on a fresh database. A file that landed in an earlier
pin and was never applied is absent from the next range, and the new API still waits forever
in `wait-app-migrations`. Web then waits in `wait-api-version-contract`. Argo shows api and web
Degraded, and the previous pods keep serving.

When `kubectl get namespace podverse-alpha` succeeds, also read what is already applied. Do
not print secret values. App database is `$POSTGRES_DB` on `podverse-db-0`:

```bash
kubectl -n podverse-alpha exec podverse-db-0 -- bash -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT migration_filename FROM linear_migration_history ORDER BY 1;"'
```

Management database name is `DB_MANAGEMENT_NAME` in Secret `podverse-db-opaque`. Decode that
one key, then run the same query against that database. Pending means a `*.sql` basename at
`origin/develop` under `linear-migrations/app` or `linear-migrations/management` that is missing
from that database's history.

If the cluster cannot be read, say so. Pending is then the git diff only. Do not write `none`
for that case; write `unconfirmed` plus the diff result.

One manual job per database applies every pending file for that database, in order. Name each
filename in the checklist. Do not create a second job for a second file.

### Env since the last pin

Run this before the checklist file exists. A checklist with no `Env:` line is incomplete. Do not
guess `none`.

The range is the same pin as **What changed**. For mobile keys, use the git commit on the newest
finished EAS `beta` build when that commit is known. Otherwise use the cluster pin and say the
mobile baseline is the pin.

Diff that range for:

- `apps/*/.env.example`, `apps/*/sidecar/.env.example`, and `extensions/*/.env.example`
- `infra/k8s/base/**/source/*.env`
- `apps/api`, `apps/management-api`, and `apps/workers` `src/lib/startup/validation.ts`
- `apps/web/scripts/validate-env.ts` and `apps/management-web/scripts/validate-env.ts`
- `apps/mobile/.env.example` when the mobile lane is included

A key is in play when that diff adds it, removes it, or changes a `KEY=` value, or when it adds or
drops `validateRequired('KEY'` or another validator called with required true. Ignore comment-only
edits. Ignore `API_RELEASE` and `READINESS_API_EXPECTED_RELEASE`; the pin step already sets those.

Alpha pods receive the base env from the pinned tag, then `configMapGenerator` `behavior: merge`
from `k.podcastdj.com` `apps/podverse-alpha/**/source/*.env`. The overlay wins on the same key.
Match a base file to the overlay file with the same basename (`api.env` to
`apps/podverse-alpha/api/source/api.env`, and the same for workers, web, management-api, and
management-web). `product-membership-settings.env` and the extension env files live under
`apps/podverse-alpha/common/source/`.

A required key is one that `origin/develop` rejects at startup when unset. It is **missing** when
it is absent from the base env at `origin/develop`, absent from the alpha overlay, and absent from
secret key names, or when the overlay sets it to an empty value. Secret key names come from
comments in the alpha env files and from `scripts/secret-generators/`. A SOPS file that lists the
key next to `ENC[` counts as present. Do not decrypt, and do not copy a value or an `ENC[` blob
into the checklist or the reply.

An overlay key is **stale** when the overlay sets it and the base `source/*.env` value changed in
the range (or `.env.example`, when the base file has no line). The new base value will not apply.
Do not print either value. Do not replace the overlay with the base file. Alpha hosts and flags
differ from base on purpose; the operator confirms the alpha value before the pin commit.

A new key that is already in the base env and not overridden ships with the pin. Leave it off the
`Env:` line. A new optional key that is in neither the base env nor the overlay is a confirm line
under `Env:`, not a commit requirement, unless startup requires it.

Mobile keys added in that range are not in git on the cluster. Name each one as `mobile KEY — set
on the EAS preview environment before the build` (profile `beta` uses `preview`). Do not put
`make mobile_eas_env_set` in the file until the operator gives the value in this conversation.
Never write that value into the file.

`Env:` is `none` when nothing is missing or stale and no mobile key was added. Otherwise one
clause per key, with the overlay path or the secret name. When the GitOps checkout cannot be
read, write `unconfirmed` plus which keys the diff added. Do not write `none` for that case.

The pin commit includes every missing or stale edit whose value the operator has already chosen.
Skip secret generators unless a new secret is required for startup. Never commit decrypted
secrets.

## Where the checklist file goes

When alpha is clear and a lane has changes, write one markdown file locally. Do not put it in the
git repo.

`/tmp/abcdeploysteps/podverse-alpha-<YYYYMMDD-HHMM>.md`

Create the directory if needed. No secrets, tokens, or decrypted env. Tell the operator the path.
The chat reply is the same checklist, with the blockers (or "clear") first.

## How to write the file

Short headings, ordered steps, copy-paste commands. Almost no explanation. Fill in the real pin,
version, and commit range. The new staging number does not exist until **Publish (staging)**
finishes. The checklist still includes the GitOps pin as the last letter of series 1. That letter
reads the tag from the Podverse remote. It does not contain `NEW_TAG`, `staging.N`, or `X.Y.Z`.
When the tag is already known, write that literal into the pin commands instead of the lookup.

Operator commands are fish-safe (**fish-operator-commands**): fence labeled `bash`, no heredoc,
no `VAR=value command`, no `[[ ]]`. One command per fence when the command prompts (every
`make mobile_eas_*` build, submit, and rollout).

Name the cwd in bold before each fence. Use **Root** and **Mobile** from
`.vscode/terminals.json` for Podverse commands. GitOps commands are a terminal whose cwd is the
`k.podcastdj.com` repo root. There is no GitOps tab.

### Step numbers

Label every operator step `<number><letter>`: `1a`, `1b`, `2a`, `3a`, `3b`, `3c`.

The number is one terminal. Letters in that number run there, in order. Do not paste `1b` into a
different terminal, and do not paste it until `1a` in that terminal has finished.

A different number is a different terminal. It can run beside the others when the start condition
on its first letter says so. Put that start condition on the first letter (`2a` starts with `1a`
when its lane allows it).

Series 1 is the server lane. Its early letters run in **Root**. Its last letter is the GitOps pin.
That letter runs in the `k.podcastdj.com` repo root, and only after the publish letter has exited 0
and printed the staging tag. Say that directory change on the letter. Cluster waits, migrations,
and smoke are the next number, in that same GitOps checkout, and they start only after the pin
push.

The recipes below use `1.` `2.` `3.` as content order. Those are not the labels in the file or the
reply. Translate them into `1a`, `1b`, `2a`, and so on when writing the checklist.

When a step has a command and a prompt/answer table, the command fence comes first and the table
follows it.

When a later step must wait for auto-sync, a workflow, or any other background finish, the step
in front of it is a command that blocks until that condition is true and exits 0. The operator
runs the next command only after that one returns. Do not write "after it is healthy" without
that command. A timeout means stop.

For this cluster, run that wait from the `k.podcastdj.com` repo root so `git rev-parse HEAD` is
the pin commit. The first wait returns when each named Argo app is synced to that commit. The
next wait returns when those apps are Healthy.

Commands run from the Podverse repo root or the GitOps repo root. Prefer `make mobile_eas_*`.
Publish has no Make target; use `scripts/publish/`. Do not invent a wrapper.

### File shape

```text
# abcdeploysteps podverse alpha — <local time>

Clear to deploy.
Server: <pinned tag> -> next staging tag of <X.Y.Z>
Mobile: <include, or "no mobile changes">
Commits: <range>
Migrations: <none, or "app 0003_stats_channel_hidden.sql" and the same for management. "unconfirmed" when the cluster was not read.>
Env: <none, or each missing or stale key with its overlay path. "unconfirmed" when the GitOps checkout was not read.>

## Do not
<the inadvisable list that applies this time, one line each>

## Lanes
<which terminals run at the same time>

## Steps
<1a, 1b, 1c, 2a, 3a, 3b. 1c is the GitOps pin, last letter of series 1. A different number is a separate terminal.>
```

### Lanes that may run at the same time

Put this table in the file, dropping rows for lanes you omitted.

| Lane              | Starts when                                  | Terminal                                              |
| ----------------- | -------------------------------------------- | ----------------------------------------------------- |
| Publish (staging) | `develop` is clean, pushed, notes committed  | **Root**                                              |
| iOS build         | Any time, including during Publish (staging) | **Mobile**                                            |
| Android build     | Same moment as the iOS build                 | Second **Mobile**                                     |
| GitOps pin        | Publish letter exited 0 and printed the tag  | `k.podcastdj.com` repo root (last letter of series 1) |
| iOS submit        | That iOS build finished                      | **Mobile** (after the build)                          |
| Android submit    | That Android build finished                  | Second **Mobile**                                     |

GitOps push and the two store submits may overlap. Do not start GitOps before the tag exists.
Do not sync Argo by hand while auto-sync is rolling out a later wave ahead of ops.

The sync script publishes from a temporary worktree. It does not switch branches in this checkout
and it does not change `node_modules`. The iOS build and the Android build may start at any time,
including while that script runs.

### Server steps (only if server changed)

1. **Root.** Confirm `develop` matches what will ship. If it is ahead of `origin/develop`, the
   operator pushes `develop` before the sync. Do not push it yourself.

```bash
git status
git push origin develop
```

2. **Root.** Publish images. This fast-forwards `staging` from `origin/develop`, pushes, and waits
   for **Publish (staging)**. The checkout and its `node_modules` stay as they are. When it exits
   0, it prints `Tags at <sha>:` and then the tags on that commit. The staging tag is the line
   matching `X.Y.Z-staging.N`. Stop if that line is missing, appears more than once, or ends in
   `.N`.

```bash
./scripts/publish/sync-develop-to-staging.sh
```

The next letter is the GitOps pin. It is the last letter of series 1 (`1c` when publish is `1b`).
Do not end the checklist before it.

The tag is the single line under `Tags at <sha>:` that matches `X.Y.Z-staging.N` and does not end
in `.N`. The pin commands below read that tag from the Podverse remote. They use the real old pin
and the real `X.Y.Z`. They do not ask the operator to type the new tag. A pasted `NEW_TAG`,
`staging.N`, or `X.Y.Z` lands in the files, and a committed placeholder passes the version
contract check because every file agrees. When the tag is already known, replace the lookup with
that literal in the `perl` command and the commit message.

### GitOps pin (last letter of series 1)

Repo is the local `k.podcastdj.com` checkout. Argo applications under `argocd/podverse-alpha/`
use `targetRevision: main` and automated sync. Pushing `main` is what rolls the cluster.
`?ref=` is the Podverse git tag. It is not the GitOps branch.

In one commit, set all of these to the new tag:

- Every `https://github.com/podverse/podverse//infra/k8s/base/...?ref=` under
  `apps/podverse-alpha/*/kustomization.yaml`
- Every `newTag` whose image name is `ghcr.io/podverse/podverse/` (apps and
  `extension-prometheus`)
- `READINESS_API_EXPECTED_RELEASE` in `apps/podverse-alpha/web/source/web-sidecar.env` and
  `apps/podverse-alpha/management-web/source/management-web-sidecar.env`
- `API_RELEASE` in `apps/podverse-alpha/api/source/api.env` and
  `apps/podverse-alpha/management-api/source/management-api.env`

Every one of those holds the same old tag, so one replace of the old pin covers them all.
**k.podcastdj.com repo root.** In the checklist, write the real old pin and the real base version
where this recipe says `OLD_PIN` and `X.Y.Z`. The lookup prints the new tag, refuses an empty
result or a tag that ends in `.N`, and checks that the tag exists. `sort -t. -k4n` picks the
highest staging number for that base version, which is the tag **Publish (staging)** just created.

```bash
set new_tag (git -C /Users/mitcheldowney/repos/pv/podverse ls-remote --tags origin 'refs/tags/X.Y.Z-staging.*' | string match -ar 'X\.Y\.Z-staging\.[0-9]+' | sort -t. -k4n | tail -1)
if test -z "$new_tag"; or string match -q -- '*.N' $new_tag
  echo 'Stop: no staging tag, or the tag is still a placeholder.'
  exit 1
end
echo $new_tag
git -C /Users/mitcheldowney/repos/pv/podverse fetch origin tag $new_tag
git -C /Users/mitcheldowney/repos/pv/podverse rev-parse --verify "$new_tag^{commit}"
perl -pi -e "s/OLD_PIN/$new_tag/g" (git grep -l 'OLD_PIN' -- apps/podverse-alpha)
```

Before the contract checks, both of these must print nothing. A hit means a placeholder or the old
pin survived. Stop and fix it. In the checklist, the second pattern is the real old pin.

```bash
git grep -nE 'staging\.N|REPLACE_WITH|X\.Y\.Z' -- apps/podverse-alpha
git grep -n 'OLD_PIN' -- apps/podverse-alpha
```

Leave Postgres, Valkey, and ActiveMQ tags as they are. The `Env:` line is the list of overlay
edits for this release. Include each one whose value the operator has already chosen in this
same commit, before the contract checks. A missing or stale key with no chosen value stops the
commit. Do not invent a value and do not copy an example file over the overlay.

**k.podcastdj.com repo root:**

```bash
bash ./scripts/check_podverse_alpha_version_contract.sh
bash ./scripts/secret-generators/check_db_secret_contract.sh alpha
```

Then the operator commits and pushes `main`. The same terminal still has `new_tag` from the pin
letter. When the tag was written as a literal, use that literal inside single quotes instead.

```bash
git add apps/podverse-alpha
git commit -m "Pin podverse-alpha to $new_tag."
git push
```

Auto-sync follows sync waves: `common` (-3), `db` / `keyvaldb` / `mq` (-2), `ops` (-1),
`api` / `management-api` (0), then `workers` / `cron` / `web` / `management-web` (1). Do not add
manual `argocd app sync` commands unless an application is stuck. If one is stuck, sync in that
wave order, one app at a time (`podverse-alpha-common`, then `podverse-alpha-db`, and so on).

Before any `kubectl`, have the operator confirm the context. Put this in the file and wait if
they have not confirmed in this conversation:

```bash
kubectl config current-context
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'
```

From the `k.podcastdj.com` repo root, after the pin is pushed. This returns when `db` and `ops`
are synced to that commit. Then the next command returns when they are Healthy. Run the bootstrap
job only after both return.

```bash
kubectl wait -n argocd application/podverse-alpha-db application/podverse-alpha-ops --for=jsonpath='{.status.sync.revision}'="$(git rev-parse HEAD)" --timeout=20m
```

```bash
kubectl wait -n argocd application/podverse-alpha-db application/podverse-alpha-ops --for=jsonpath='{.status.health.status}'=Healthy --timeout=20m
```

```bash
kubectl -n podverse-alpha create job --from=cronjob/ops-db-verify-bootstrap-contract ops-db-verify-bootstrap-contract-manual
```

```bash
kubectl wait -n podverse-alpha --for=condition=complete job/ops-db-verify-bootstrap-contract-manual --timeout=20m
```

```bash
kubectl -n podverse-alpha logs job/ops-db-verify-bootstrap-contract-manual
```

`logs` returns `waiting to start: ContainerCreating` if it runs while the new pod is still
starting. `--pod-running-timeout` does not prevent that. Wait for the Job `complete` condition,
which is true only after the container has finished successfully, then read the log. A timeout
means stop. Read the log and do not create the Job again.

Expect `Bootstrap contract verification passed for app and management databases.` If it fails,
the deploy is not done. Do not delete the PVC as the next step.

#### App and management migrations

These steps are required on every server deploy, after the bootstrap check and before the
public app waits. Use the pending list from **Pending migrations**. These are forward schema
updates, not a wipe. Do not re-run one after a failure; stop and read the log.

When that list is `none`, the step is one line: `No pending linear migrations.` Do not create
a migrate job.

When the app database has pending files, name them, then:

```bash
kubectl -n podverse-alpha create job --from=cronjob/ops-db-migrate-app ops-db-migrate-app-manual
```

```bash
kubectl wait -n podverse-alpha --for=condition=complete job/ops-db-migrate-app-manual --timeout=20m
```

```bash
kubectl -n podverse-alpha logs job/ops-db-migrate-app-manual
```

When the management database has pending files, name them, then:

```bash
kubectl -n podverse-alpha create job --from=cronjob/ops-db-migrate-management ops-db-migrate-management-manual
```

```bash
kubectl wait -n podverse-alpha --for=condition=complete job/ops-db-migrate-management-manual --timeout=20m
```

```bash
kubectl -n podverse-alpha logs job/ops-db-migrate-management-manual
```

Expect `Linear migration run completed.` with an `APPLY <file>` line for each new migration.

Before smoke, the same pair of waits for the public apps. Run the curls only after both return.

```bash
kubectl wait -n argocd application/podverse-alpha-api application/podverse-alpha-management-api application/podverse-alpha-web application/podverse-alpha-management-web --for=jsonpath='{.status.sync.revision}'="$(git rev-parse HEAD)" --timeout=20m
```

```bash
kubectl wait -n argocd application/podverse-alpha-api application/podverse-alpha-management-api application/podverse-alpha-web application/podverse-alpha-management-web --for=jsonpath='{.status.health.status}'=Healthy --timeout=20m
```

That wait prints nothing until every app is Healthy. A few minutes is normal for image pulls and
probes. When the operator asks whether it is stuck, the agent checks rather than guessing. These
reads are safe for the agent to run with network access:

```bash
kubectl get applications -n argocd -o custom-columns=NAME:.metadata.name,HEALTH:.status.health.status
kubectl get pods -n podverse-alpha
kubectl get pod -n podverse-alpha <new-pod> -o jsonpath='{range .status.initContainerStatuses[*]}{.name}{" ready="}{.ready}{"\n"}{end}'
kubectl logs -n podverse-alpha <new-pod> -c <waiting-init-container> --tail=15
```

A new pod parked in `Init:` for more than a few minutes is a blocker, not slowness.
`wait-app-migrations` means the migration step above was skipped. Errors from cron Job pods
that started before the pin are older problems. Report them separately.

One web or management-web restart is expected right now. The `web` container can start before
its `runtime-config` sidecar listens on 3001. The log then shows `An error occurred while loading
instrumentation hook: fetch failed` with `ECONNREFUSED 127.0.0.1:3001`, liveness returns 500,
and the container restarts once and comes up ready. More than one restart is a real failure.

Smoke:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' https://alpha.podcastdj.com/
curl -fsS -o /dev/null -w '%{http_code}\n' https://api-alpha.podcastdj.com/api/v2/
curl -fsS -o /dev/null -w '%{http_code}\n' https://management.alpha.podcastdj.com/
curl -fsS -o /dev/null -w '%{http_code}\n' https://management-api.alpha.podcastdj.com/
```

### Mobile steps (only if mobile changed)

Profile stays `beta`. Copy the current prompt-answer table from
**mobile-store-builds-on-demand** into the file after that step's command fence. The command
comes first. One command per fence.
Answers that stay the same: start the build with `y`; encryption `Y` when asked; decline
`expo-updates`; do not log in to Apple when remote credentials are already in use; do not
generate a new certificate, profile, or keystore.

**Mobile:**

```bash
make mobile_eas_ios_build
```

**Second Mobile** (same time as the iOS build and as **Publish (staging)**):

```bash
make mobile_eas_android_build
```

After that platform's build is FINISHED, and the printed commit matches the commit you meant to
ship:

```bash
make mobile_eas_ios_submit
```

```bash
make mobile_eas_android_submit
```

iOS submit goes to TestFlight. Paste the printed notes into What to Test. Android submit uploads
a Play internal draft. Testers see nothing until a separate rollout. Only include rollout when
the operator wants testers on this binary, in its own fence, and only for the versionCode printed
for the build just made:

```bash
make mobile_eas_android_submit ROLLOUT=1
```

Type that versionCode when asked. If the script prints an older finished build, the answer is
Return, which cancels.

Add the CarPlay or Android Auto manual check only when this diff touches that surface. Point at
the checklist path in `apps/mobile/modules/podverse-media-engine/`. Do not paste those steps.

## Reply shape

1. Clear, or the blockers. Blockers end the reply.
2. Which surfaces changed, from which tag or build, in a few commit subjects.
3. The `Migrations:` line. A server deploy that omits it is not done.
4. The `Env:` line. A checklist that omits it is not done.
5. The lanes that run together.
6. The steps (same text as the file).
7. The temp file path.

Do not run the steps from this command. If the operator later tells you to carry out the pin
or to finish the alpha update, that is **abcdeployrun** for the server lane, and it includes
the migrate jobs when `Migrations:` is not `none`. A pin whose pending list is not `none` is
not done at `git push`. Do not hand those jobs back as the next paste when you are the one
deploying. The new API stays in `wait-app-migrations` until they run.

Still refuse EAS build or submit, a database wipe, secret generation, and a `main` promote.
Repeat the warning before any step in the inadvisable list. That refusal is for this command.
`abcdeployrun` runs the server and GitOps steps, including the migrate jobs.
