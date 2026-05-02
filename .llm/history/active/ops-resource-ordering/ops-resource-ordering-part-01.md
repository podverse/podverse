# ops-resource-ordering

Started: 2026-05-02

### Session 1 - 2026-05-02

#### Prompt (Developer)

in the ops files the resources as they display in argocd should be in alphabetical order. also, instead of ops-mq-rss-_ the name should just be mq-rss-_

#### Key Decisions

- Sort `infra/k8s/base/ops/kustomization.yaml` `resources` entries alphabetically for stable Argo CD display order.
- Rename the two RSS queue CronJob Kubernetes object names from `ops-mq-rss-*` to `mq-rss-*`.
- Rename matching manifest filenames to `mq-rss-*` and update references in `kustomization.yaml`.

#### Files Modified

- .llm/history/active/ops-resource-ordering/ops-resource-ordering-part-01.md
- infra/k8s/base/ops/kustomization.yaml
- infra/k8s/base/ops/mq-rss-add-trending-podcast-index-1000.cronjob.yaml
- infra/k8s/base/ops/mq-rss-add-trending-podcast-index-50.cronjob.yaml
- (removed) infra/k8s/base/ops/ops-mq-rss-add-trending-podcast-index-1000.cronjob.yaml
- (removed) infra/k8s/base/ops/ops-mq-rss-add-trending-podcast-index-50.cronjob.yaml
