# Execution order — pin admin session purge CronJob image

Summary: [00-SUMMARY.md](00-SUMMARY.md). Prompts: [COPY-PASTA.md](COPY-PASTA.md).

One phase, one prompt. Run it in the worktree for this set
(`../podverse_fix_377_admin_session_purge_image`).

## Phase 1

- **01 — Pin management-api on the cron overlay; contract check; ticket reply** (Cursor Grok 4.7
  · medium). Owns:
  - `infra/k8s/alpha/cron/kustomization.yaml`
  - `../k.podcastdj.com/apps/podverse-alpha/cron/kustomization.yaml`
  - `infra/k8s/scripts/check_cronjob_contract.sh`
  - `infra/k8s/INFRA-K8S.md` (one sentence under CronJob contract)
  - `release-notes/scratchpad.md`
  - `.llm/plans/active/377-admin-session-purge-image/proposed-reply.md` (new)
