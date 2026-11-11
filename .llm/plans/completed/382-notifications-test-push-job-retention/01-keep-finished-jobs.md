**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# Keep finished notification test Jobs

Issue: https://github.com/podverse/podverse/issues/382

`ops-notifications-test-push` is a suspended CronJob. Operators start it with
`npm run notifications:test-push:k8s`, which creates an owned Job and replaces the
default `--help` args. `ttlSecondsAfterFinished: 600` deletes that Job after 10
minutes. `failedJobsHistoryLimit: 5` never applies, the container logs go with the
Job, and `CronJobLastRunFailed` in
`infra/k8s/base/monitoring/workloads.rules.yaml` resolves because kube-state-metrics
no longer sees the failed Job.

The operator chose to remove that field. A later manual Job in the thread completed,
and the failure logs are already gone, so this change does not touch the worker, the
trigger script, or the alert expression.

## Rows

R1. Remove `ttlSecondsAfterFinished` from `ops-notifications-test-push` so finished
Jobs stay until the history limits replace them.

## Runs after

none

## Files

- infra/k8s/base/ops/notifications-test-push.cronjob.yaml
- release-notes/scratchpad.md
- .llm/plans/active/382-notifications-test-push-job-retention/proposed-reply.md

## Tests

none

The monitoring rule tests do not encode Job lifetime. Do not add a test that only
asserts this field.

## Release scratchpad

Append this entry at the end of `release-notes/scratchpad.md`. Do not edit other
entries.

```markdown
## Manual notification test Jobs keep their logs

- Surfaces: k8s
- Change: `ops-notifications-test-push` no longer deletes a finished Job after 10
  minutes. The last 5 successes and last 5 failures stay, including container logs,
  until a newer Job of that result replaces them. `CronJobLastRunFailed` stays until
  a later success.
- Who notices: operators triaging alpha alerts for the manual notifications test push
- Operator steps: alpha picks this up when the ops base ref includes the commit
```

## Ticket reply

Write `.llm/plans/active/382-notifications-test-push-job-retention/proposed-reply.md`
with the text below, and repeat that same text in a fenced `text` block in the final
message. Do not post it. Do not run `gh issue comment`.

```text
Finished runs of the manual notifications test Job now stay until newer runs replace them (the last 5 failures and the last 5 successes). A failed run no longer disappears after 10 minutes, so CronJobLastRunFailed stays until a later run succeeds, and the Job logs are still there for that check.

The failures in this thread were hand-triggered runs. A later run completed, and those logs were already gone, so the worker command is unchanged. The next failed run can be read with kubectl -n podverse-alpha logs job/<job-name> --tail=100.
```

## Change

In `infra/k8s/base/ops/notifications-test-push.cronjob.yaml`:

- Delete `ttlSecondsAfterFinished: 600` from `spec.jobTemplate.spec`.
- Leave `successfulJobsHistoryLimit: 5`, `failedJobsHistoryLimit: 5`,
  `backoffLimit: 0`, `activeDeadlineSeconds: 900`, and the exit-78
  `podFailurePolicy` as they are.
- Add a comment on the history limits. It describes the file as it stands: finished
  Jobs stay until these limits replace them, and `CronJobLastRunFailed` reads those
  Job objects, so a failed run stays visible, with its logs, until a later success
  or a newer failure takes its place. Do not describe the removed field.

`kubectl create job --from=cronjob` sets a controller ownerReference. The CronJob
controller applies the history limits to those owned Jobs, including while the
CronJob is suspended. If you find that cleanup does not run while it is suspended,
stop and ask. Do not put a time-to-live back.

Do not edit `scripts/k8s/run-notifications-test-push-job.sh`, the alert rule, other
CronJobs, or any overlay image ref. `infra/k8s/alpha/ops/kustomization.yaml` loads
base ops from a remote git ref, so a local build of that overlay does not show this
edit. Do not start a Job.

## Close

This is the only plan in the set. Move
`.llm/plans/active/382-notifications-test-push-job-retention/` to
`.llm/plans/completed/382-notifications-test-push-job-retention/`.
`proposed-reply.md` moves with it.
