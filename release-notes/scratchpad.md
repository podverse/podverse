## Alpha migrate wait pages name the init container

- Surfaces: k8s optional alerting examples, triage docs
- Change: `PodverseDeployWaitingOnMigration` warns when migrate or version-contract init
  containers run for 10 minutes and names which Job to run; Alertmanager inhibits the generic
  `ArgoAppDegraded` critical for that namespace while it fires. Triage bot treats that wait (and
  one web runtime-config sidecar restart) as nothing to do.
- Who notices: alpha operators during a deploy that needs a manual migrate Job
- Operator steps: push the matching Prometheus, Alertmanager, and Argo CD notifications
  changes in the GitOps repo; paste the standing rule into the Podverse alpha triage bot
