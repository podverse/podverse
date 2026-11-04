# Alert triage read role

Copy [triage-read.yaml](triage-read.yaml) into the environment's GitOps manifests. Replace
`<namespace>` and `<bot-group>`. Argo CD applies that GitOps copy. This folder is not applied
from the monorepo.

The Role grants get, list, and watch on workloads, logs, and events in one namespace. It does
not grant secrets, configmaps, pod exec, or any write verb.

Podverse alpha uses namespace `podverse-alpha` and group `podverse-alpha-triage`.

See [Agent alert triage](/docs/operations/observability/AGENT-ALERT-TRIAGE.md).
