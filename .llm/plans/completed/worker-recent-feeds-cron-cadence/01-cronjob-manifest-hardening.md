---
name: worker-recent-feeds-cronjob-hardening
overview: Add Kubernetes guardrails so worker-recent-feeds cannot block the 5-minute schedule for hours, and improve Job history visibility in Argo CD.
todos:
  - id: active-deadline
    content: Add activeDeadlineSeconds to worker-recent-feeds Job template
    status: pending
  - id: success-history
    content: Set successfulJobsHistoryLimit for observability
    status: pending
  - id: concurrency-decision
    content: Document and apply concurrencyPolicy choice (Forbid vs Replace)
    status: pending
isProject: false
---

# CronJob manifest hardening

## File

[`infra/k8s/base/cron/worker-recent-feeds.cronjob.yaml`](../../../infra/k8s/base/cron/worker-recent-feeds.cronjob.yaml)

## Changes

### 1. `activeDeadlineSeconds` (required)

Add under `jobTemplate.spec` (sibling of `backoffLimit`):

```yaml
activeDeadlineSeconds: 600
```

Rationale from investigation:

- Recent successful Job `29697260` needed **~570s** end-to-end (PI pagination dominated).
- Use **600** (10 minutes) as a safety net against **indefinite** hangs while allowing current peak
  load. Revisit down to **480** after prompt 3 reduces PI fetch time.

When deadline fires, Kubernetes terminates the Job; with `Forbid`, the **next 5-minute tick can
start**. This directly addresses hour-scale schedule holes.

### 2. `successfulJobsHistoryLimit: 30` (required)

Match [`worker-delete-outdated.cronjob.yaml`](../../../infra/k8s/base/cron/worker-delete-outdated.cronjob.yaml).
Default **3** makes Argo CD look like there are multi-hour gaps when Jobs actually ran and were GC'd.

Optional: `ttlSecondsAfterFinished: 86400` if we want completed Jobs to expire consistently (not
required for cadence fix).

### 3. `concurrencyPolicy` (decision)

**Default recommendation:** keep **`Forbid`** once `activeDeadlineSeconds` + code bounds (prompts 2–3)
ensure runs usually finish under 5 minutes.

**Alternative:** change to **`Replace`** if product priority is **strict 5-minute cadence** even when
a run is still enqueueing feeds. Replace cancels the in-flight Job when the next tick fires. Only choose
this if operators accept partial enqueue passes.

Document the chosen policy in a brief comment above `concurrencyPolicy` in the YAML.

## Do not change

- `schedule: "*/5 * * * *"` — correct
- `backoffLimit: 0` / `restartPolicy: Never` — intentional; cron schedule is the retry mechanism
- `-sr 900` — separate concern (prompt 3)

## Verification

Operator runs kustomize dry-run and pushes to GitOps; see COPY-PASTA verification block.
