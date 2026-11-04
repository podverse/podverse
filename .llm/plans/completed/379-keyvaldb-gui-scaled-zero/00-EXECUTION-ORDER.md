# Execution order — silence expected scale-to-zero for keyvaldb GUI

Summary: [00-SUMMARY.md](00-SUMMARY.md). Prompts: [COPY-PASTA.md](COPY-PASTA.md).

One phase, one prompt. Run it in the worktree for this set
(`../podverse_fix_379_keyvaldb_gui_scaled_zero`).

## Phase 1

- **01 — Opt-out label, PromQL unless, allowlist, ticket reply** (Cursor Grok 4.7 · high). Owns:
  - `infra/k8s/base/monitoring/workloads.rules.yaml`
  - `infra/k8s/base/monitoring/rules.test.yaml`
  - `infra/k8s/base/ops/keyvaldb-gui.deployment.yaml`
  - `infra/k8s/INFRA-K8S.md`
  - `infra/k8s/alpha/examples/optional-alerting/README.md`
  - `infra/k8s/alpha/examples/optional-alerting/kube-state-metrics.yaml`
  - `../k.podcastdj.com/apps/prometheus/manifests/podverse-prometheus-rules.yaml`
  - `../k.podcastdj.com/apps/kube-state-metrics/manifests/kube-state-metrics.yaml`
  - `../k.podcastdj.com/apps/podverse-alpha/ops/kustomization.yaml`
  - `release-notes/scratchpad.md`
  - `.llm/plans/active/379-keyvaldb-gui-scaled-zero/proposed-reply.md` (new)
