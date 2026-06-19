# Execution order — worker-recent-feeds cron cadence

Run prompts from [`COPY-PASTA.md`](COPY-PASTA.md) in this order:

1. [`01-cronjob-manifest-hardening.md`](01-cronjob-manifest-hardening.md) — K8s guardrails (low risk, immediate cadence safety net)
2. [`02-podcast-index-request-timeouts.md`](02-podcast-index-request-timeouts.md) — fail-fast HTTP for PI client
3. [`03-recent-feeds-pagination-bounds.md`](03-recent-feeds-pagination-bounds.md) — cap cron worker PI fetch duration

After all prompts: push to GitOps branch and verify cron cadence in cluster (see COPY-PASTA verification block).
