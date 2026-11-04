**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 01 — Pin management-api on the cron overlay

## Rows

R1, R2, R3, R4

## Runs after

none

## Problem

Alpha cron GitOps and the example overlay in this repo retag only
`ghcr.io/podverse/podverse/workers`. The admin session purge CronJob uses
`ghcr.io/podverse/podverse/management-api` with no tag, so the cluster pulls `:latest`. The Job
from 2026-11-01 stayed on an older image that ignored `adminSessionPurge` and never exited.
`concurrencyPolicy: Forbid` skipped every later night.

The purge exit branch and `activeDeadlineSeconds: 3600` / `backoffLimit: 0` are already in
`5.6.0-staging.6`. Do not edit the base CronJob manifest.

## Decisions (locked)

1. **Pin, do not retag the base.** Add an `images:` entry for
   `ghcr.io/podverse/podverse/management-api` next to the workers entry. Do not change the image
   name in `infra/k8s/base/cron/management-api-admin-session-purge.cronjob.yaml`.
2. **Example overlay tag.** In `infra/k8s/alpha/cron/kustomization.yaml`, use
   `newTag: "X.Y.Z-staging.N"` so it stays a placeholder like the workers entry and the remote
   `?ref=`.
3. **Live overlay tag.** In `../k.podcastdj.com/apps/podverse-alpha/cron/kustomization.yaml`, use
   `newTag: "5.6.0-staging.6"` to match that file's current workers tag and `?ref=`. Keep the
   existing `backoffLimit: 0` patch. Update the Description comment so it is not workers-only.
4. **Do not change deadlines.** Leave `activeDeadlineSeconds: 3600` and `backoffLimit: 0` on the
   base CronJob as they are.
5. **Contract check.** Extend `infra/k8s/scripts/check_cronjob_contract.sh` so every distinct
   `ghcr.io/podverse/podverse/` image name that appears under `infra/k8s/base/cron/` is listed
   under `images:` in `infra/k8s/alpha/cron/kustomization.yaml`. Fail with a clear ERROR when one
   is missing. Keep the existing label / deadline / concurrency checks. The script already runs
   in CI.
6. **Docs.** Under `## CronJob contract` in `infra/k8s/INFRA-K8S.md`, add one sentence that the
   alpha cron overlay (and the check script) must pin every Podverse image the base cron
   manifests use.
7. **Stuck Job.** Do not run `kubectl`. Put the delete command in the ticket reply and in the
   final message for the operator. Job name:
   `management-api-admin-session-purge-29892165`, namespace `podverse-alpha`.
8. **Ticket reply.** Write
   `.llm/plans/active/377-admin-session-purge-image/proposed-reply.md` and repeat the same text
   in a fenced `text` block in the final message. Do not run `gh issue comment` or any other
   write to the tracker.

## Work

1. Edit `infra/k8s/alpha/cron/kustomization.yaml`:
   - Description: say it pins worker and management-api image tags for the cron base.
   - Under `images:`, keep workers, add:

     ```yaml
     - name: ghcr.io/podverse/podverse/management-api
       newTag: "X.Y.Z-staging.N"
     ```

2. Edit `../k.podcastdj.com/apps/podverse-alpha/cron/kustomization.yaml` the same way, with
   `newTag: "5.6.0-staging.6"`. That path is the sibling GitOps checkout relative to this
   worktree. Leave its commit and push to the operator.

3. Extend `infra/k8s/scripts/check_cronjob_contract.sh`:
   - After the existing CronJob loop (or as a second section before the final pass/fail), collect
     unique `image:` values under `infra/k8s/base/cron/` that start with
     `ghcr.io/podverse/podverse/`.
   - Read `images[].name` from `infra/k8s/alpha/cron/kustomization.yaml`.
   - For each base image name missing from that list, print an ERROR and increment errors.
   - Keep `yq` / `jq` usage consistent with the rest of the script.

4. Add one sentence to `infra/k8s/INFRA-K8S.md` under `## CronJob contract` about pinning every
   Podverse image the cron base uses in the alpha cron overlay.

5. Append the release scratchpad entry below to `release-notes/scratchpad.md`.

6. Write `proposed-reply.md` with the text under **Ticket reply** below.

7. Close the set: move `01-pin-management-api-cron-image.md`, `00-SUMMARY.md`,
   `00-EXECUTION-ORDER.md`, `COPY-PASTA.md`, and `proposed-reply.md` to
   `.llm/plans/completed/377-admin-session-purge-image/`, then remove the empty
   `active/377-admin-session-purge-image/` directory.

## Files

- `infra/k8s/alpha/cron/kustomization.yaml`
- `../k.podcastdj.com/apps/podverse-alpha/cron/kustomization.yaml`
- `infra/k8s/scripts/check_cronjob_contract.sh`
- `infra/k8s/INFRA-K8S.md`
- `release-notes/scratchpad.md`
- `.llm/plans/active/377-admin-session-purge-image/proposed-reply.md` (new; moves to completed with the set)

## Tests

- Extended `check_cronjob_contract.sh` (image-name coverage for the alpha cron overlay). No new
  unit, API, Playwright, or Maestro specs.

## Release scratchpad

```markdown
## Cron overlay pins management-api for admin session purge

- Surfaces: k8s, ops
- Change: The alpha cron Kustomize overlay sets `newTag` for
  `ghcr.io/podverse/podverse/management-api` as well as workers, so the
  `management-api-admin-session-purge` CronJob no longer pulls an untagged image. The CronJob
  contract check fails when a Podverse image under `infra/k8s/base/cron/` is missing from that
  overlay's `images:` list.
- Who notices: alpha operators after the GitOps pin syncs; daily admin session purge can run again
  once the stuck Job is deleted
- Operator steps: push the k.podcastdj.com cron overlay change; after Argo syncs, delete Job
  `management-api-admin-session-purge-29892165` in `podverse-alpha`
```

## Ticket reply

Write this into `proposed-reply.md` and the final message. Operator pastes it on the issue after
the pin is on `develop` and alpha `main`, and after deleting the Job. No file names, plan numbers,
or refactors.

```text
The purge command and a one-hour deadline are already in the alpha staging tag. The Job from 1 Nov started on an older untagged management-api image and never exited, and Forbid skipped every later night. The cron overlay now pins that image to the same tag as the other Podverse apps. After that sync, delete Job management-api-admin-session-purge-29892165 so the next 04:45 UTC run can start.
```

Operator delete (after Argo shows the CronJob image tag `5.6.0-staging.6`):

```bash
kubectl -n podverse-alpha delete job management-api-admin-session-purge-29892165
```
