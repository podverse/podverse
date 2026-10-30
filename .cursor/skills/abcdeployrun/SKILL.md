---
name: abcdeployrun
description: When the operator runs /abcdeployrun or says abcdeployrun, plus a repo and an environment (abcdeployrun podverse alpha), run the unattended alpha server deploy. Sync develop to staging, wait for images, pin k.podcastdj.com, and wait until Argo is healthy. Use only for that keyword, and only when the repo word is podverse and the environment word is alpha.
---

# `abcdeployrun`

The operator is leaving the agent to deploy. Run the server path below. Do not stop to ask
while a step is inside the allowed list and is succeeding.

`abcdeploysteps` writes a checklist and does not deploy. This command is the one that deploys.
The "do not run" lines in that skill do not apply here. Its server and GitOps sections are the
recipe for commands, waits, and what "healthy" means. This skill decides what may run.

## Stop before anything destructive

Alpha being disposable does not make an unusual destructive action okay. The operator is away
and did not approve it in this conversation.

Stop, write the concern in the log, and do not run the command when the next action would:

- Delete or wipe data, a PVC, a namespace, a pod, a job, or an Argo application
- Run `apps/podverse-alpha/scripts/ops/reset-alpha-db.sh` or any database reset
- Force-push, rebase published history, or delete a branch or worktree
- Promote `staging` to `main`, run `sync-staging-to-main.sh`, or publish `:latest`
- Run `bump-version.sh`, an EAS build or submit, or change a bundle id
- Generate, rotate, or decrypt a secret, or commit decrypted secret material
- Change a third-party image tag (Postgres, Valkey, ActiveMQ)
- Switch kubectl context, or act on a context that cannot see `podverse-alpha`
- Invent an env value, feature flag, or overlay edit that is not the release pin
- Retry a failed migration or bootstrap job, or delete the PVC after a failure

If you are unsure whether a command is destructive, and it is not in **Allowed actions**, stop.
Do not pick a milder substitute and continue.

## The repo and the environment are required

`abcdeployrun` is three words. The second word is the repo. The third word is the environment.

- `abcdeployrun podverse alpha` — run
- `abcdeployrun podverse beta` — stop. Beta is not stood up.
- `abcdeployrun podverse production` — stop. Do not promote `main`.

This skill applies only when the repo word is `podverse`. Do not infer the repo from the open
workspace. Do not assume alpha. If either word is missing, ask and stop.

Mobile is out of this command. If `apps/mobile/` changed, say so in the log and do not build or
submit.

## Where the work runs

Podverse commands run at the Podverse repo root. GitOps commands run at the `k.podcastdj.com`
checkout. Confirm `origin` before any push: Podverse's origin contains `podverse/podverse`, and
the GitOps origin ends with `k.podcastdj.com.git`. If either checkout is missing or dirty in a
way the preflight does not allow, stop.

The agent runs the commands in its own shell. Do not hand the running steps to the operator as
a paste. A stopped run tells them why and the single next human step.

`make alpha_*` is local Docker. It does not deploy `alpha.podcastdj.com`. Never run it here.

## Log

Write `/tmp/abcdeployrun/podverse-alpha-<YYYYMMDD-HHMM>.md` at the start. Append after each
phase: what ran, the SHA or tag, and the result. No secrets or decrypted env.

On a later run, read the newest log and the git and Actions state. Continue the unfinished
phase. Do not start a second publish for a SHA that already has a staging tag or an in-progress
`publish-staging.yml` run.

## Preflight

Stop before any push when any of these is true:

- Podverse worktree is dirty (`git status --porcelain`). List the paths.
- `release-notes/scratchpad.md` is missing or not empty. The next human step is
  **abcreleasenotes**, committed on `develop`. Do not run that command yourself.
- `release-notes/<X.Y.Z>.md` is missing or empty for the root `package.json` version.
- `origin/staging` is not a fast-forward ancestor of `origin/develop`.
- Local `develop` has diverged from `origin/develop` (not a fast-forward).
- `gh auth status` is not logged in.
- The commit range needs a database wipe, a migration squash reload, a PVC delete, or a
  namespace teardown.
- Nothing on the server has changed since the pinned tag (see **What changed** in
  `abcdeploysteps`). Say the cluster is already on that tag.
- The pinned value is not a real tag. Say so and stop. Do not invent the pin.

A docs-only, test-only, or `.cursor/`-only diff is nothing to ship.

## Allowed actions

Only these writes, and only after preflight passes:

1. Podverse, on `develop` only: `git push origin develop` when local `develop` is strictly
   ahead of `origin/develop` and that push is a fast-forward. No force, no other ref.
2. Podverse: `./scripts/publish/sync-develop-to-staging.sh` with no flags. That script pushes
   `staging` and waits until **Publish (staging)** finishes. Do not pass `--dry-run` on a real
   run. Do not push `staging` any other way.
3. `k.podcastdj.com`, on `main` only: one commit whose only change is the alpha pin described
   under **Env and pin**, then `git push` with no force and no refspec. Stop if `main` is not
   a fast-forward of `origin/main`.
4. The kubectl reads, waits, and `create job --from=cronjob/...` commands in the GitOps section
   of `abcdeploysteps`. Create each manual job once. Manual `argocd app sync` only when an
   application is stuck, one app at a time, in the wave order that skill lists.

Read-only `git`, `gh run list`, `gh run view`, and `kubectl get` / `kubectl logs` are fine.

## Env and pin

Wait until the sync script exits 0 and prints one tag matching `X.Y.Z-staging.N`. Stop if that
line is missing, appears more than once, or ends in `.N`.

Then, in `k.podcastdj.com`, replace the old pin with that tag everywhere `abcdeploysteps` lists
(`?ref=`, `newTag` for `ghcr.io/podverse/podverse/`, `API_RELEASE`,
`READINESS_API_EXPECTED_RELEASE`).
The agent shell is zsh. Apply the replace with `git grep -l` piped to `xargs perl -pi -e`, not
with fish command substitution.

Run the two `git grep` checks and both contract scripts from that skill. A hit or a failing
script stops the run before the commit.

Other env values stay as they are. Compare required keys at the new tag
(`apps/*/src/lib/startup/validation.ts` and the web `validate-env` scripts) with the previous
pin. A key that is newly required must already have a non-empty value in the alpha
`source/*.env` for that workload, in the base `source/*.env` at the new tag, or in an existing
secret mount. If it does not, stop and name the key. Do not add a value. Do not copy an example
file over the alpha overlay.

## Cluster

Do not change kubectl context. Before the first kubectl write, record the context and the API
server, and run `kubectl get namespace podverse-alpha`. Stop if that namespace is not found.

Then follow the GitOps waits in `abcdeploysteps`: `db` and `ops` synced and Healthy, the
bootstrap job, app and management migrations only when the commit range adds files under
`infra/k8s/base/ops/source/database/linear-migrations/`, then the public apps synced and
Healthy, then the four smoke curls.

A timeout, a failed job, or a pod stuck in `Init:` is a stop. Read the log the skill names.
Do not create the job again. One web or management-web restart from the sidecar race is
expected. More than one restart is a stop.

Public hosts, after both public waits return:

- `https://alpha.podcastdj.com/`
- `https://api-alpha.podcastdj.com/api/v2/`
- `https://management.alpha.podcastdj.com/`
- `https://management-api.alpha.podcastdj.com/`

## Reply

When the run finishes, say whether alpha is serving the new tag or why it stopped. Include the
tag, the GitOps commit, smoke status codes when they ran, and the log path. Mention mobile only
to say this command did not build it.
