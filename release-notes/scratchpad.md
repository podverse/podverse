## Remove RedisInsight KeyValDB GUI

- Surfaces: k8s ops, alpha Docker, local Docker, monitoring rules
- Change: Dropped the optional RedisInsight (`podverse-keyvaldb-gui`) Deployment/Service
  from the ops bundle, removed the compose GUI containers, and restored
  `DeploymentScaledToZero` without the `podverse.fm/expected-replicas` opt-out. Valkey
  (`podverse-keyvaldb`) is unchanged.
- Who notices: operators who used RedisInsight on local `:8001`, alpha aux `:8001`, or
  the k8s GUI connect script; alpha alert noise for the scaled-to-zero GUI stops after
  the ops app prunes the Deployment
- Operator steps: after the GitOps ops overlay pins a base without the GUI, let Argo
  prune; on aux/local recreate the keyvaldb compose project so the old GUI container
  is removed (`--remove-orphans` on down)
