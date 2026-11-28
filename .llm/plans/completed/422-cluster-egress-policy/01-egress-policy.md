# Dropped

The operator closed https://github.com/podverse/podverse/issues/422 with no product change.
Do not write a NetworkPolicy from this plan. Feed parsing and the image proxy still open
connections to hosts named at request time.

# Cluster workloads cannot open arbitrary outbound connections

**Cursor model:** Opus 5.5 · **Reasoning:** high

## Issue

https://github.com/podverse/podverse/issues/422

## Rows

- **R1** Pods may open outbound connections only to hosts the operator confirmed.

## Runs after

none

Read `.cursor/skills/k8s/SKILL.md` before editing manifests.

## Operator questions

Do not write a `NetworkPolicy` in the first turn.

1. Inventory outbound destinations from the code and the env templates: database, Valkey,
   DNS, and every outside host the API, workers, web, management apps, and cron jobs
   call. Group them by workload. Cite the file that shows each destination. Skip hosts
   that appear only in comments.
2. Put that list in the chat and stop. Ask the operator to confirm it, to add anything
   missing, and to say which namespaces the policy covers. If this step is under
   plan-runner, report `RUNNER-STATUS: BLOCKED` with the list and the question.
3. After they confirm, write the policy from that list. Do not add a host they did not
   confirm. Do not drop one they added.

## Alpha GitOps (k.podcastdj.com)

Alpha applies `infra/k8s/base/<component>?ref=<tag>` from each overlay under
`apps/podverse-alpha/`. A policy in one of those bases reaches alpha only when that
overlay's `?ref=` moves to a tag that contains it. Put each policy on a base the alpha
overlay already includes. A new folder alpha does not reference does nothing there.

Seed the inventory with the outside hosts already named in
`apps/podverse-alpha/**/source/*.env`, including Podcast Index, the DigitalOcean Spaces
bucket and CDN, the mail relay, and the billing and push hosts those files name. Also
include in-cluster services the env already uses: `podverse-db`, `podverse-keyvaldb`,
`podverse-mq`, and `podverse-api`. DNS is required. Ingress is Traefik and is not an
egress destination.

If alpha needs a host the shared policy must not grant to every environment, add the
exception in the alpha overlay in k.podcastdj.com, not by widening the base. The final
message lists the `?ref=` bumps and any alpha-only exception file. Do not edit
k.podcastdj.com from this plan. No logout and no migration. The policy does not end
sessions. A missed host shows up as a failed feed, image, mail, or payment call after
the ref bump, which is why the list is confirmed first.

## Files

- A new `NetworkPolicy` under `infra/k8s/`, wired into the kustomization the skill uses
  for resources that apply to every environment the operator named
- No application code, unless the inventory finds a fetch this policy would strand and
  the operator says to leave that workload unrestricted. Record that exception in the
  policy comment and in the final message.

## Tests

No unit test. In the final message, repeat the confirmed allowlist and the namespaces.
Do not apply the policy to a cluster. Do not run `kubectl`.

## Release scratchpad

Append after the policy is written:

```markdown
## Pods may open only confirmed outbound connections

- Surfaces: k8s
- Change: egress is denied except for the hosts the operator confirmed for each workload.
- Who notices: operators, if a workload needs a host that was left off the list. Users
  notice only if a feed, image, or payment call starts failing for that reason.
- Operator steps: bump the alpha `?ref=` values in k.podcastdj.com for every base that
  gained a policy, and add an alpha-only exception there if the confirmed list needs one.
  Push that GitOps branch and let the cluster sync. Do not apply the policy from a laptop.
  No logout.
```

## Work

There is no `NetworkPolicy` in the repo. Workloads live under `infra/k8s/base/`.

The policy is default-deny egress, with exceptions only from the confirmed list. DNS
must be one of those exceptions or nothing else resolves. In-cluster services the
workloads already call (database, Valkey) are exceptions by their in-cluster addresses,
not by public hostnames.

Do not use a policy that allows all egress and then names a few blocks. The default is
deny.

Leave ingress rules alone unless the skill says a new egress policy would also change
ingress. If it would, stop and ask before adding ingress rules.

## Ticket reply

Save as `proposed-reply.md`. Do not post it. After the change is on `develop`, post it
and close issue 422.

```text
Cluster workloads no longer open arbitrary outbound connections. Egress is denied
except for the hosts confirmed for each workload, including DNS and the in-cluster
database and cache. Push the GitOps branch and let the cluster sync. Do not apply the
policy from a laptop. If a feed, image, or payment call fails because a host was left
off the list, add that host and sync again.
```

## Done

Search issue 422 again before writing the policy, which is after the operator confirms
the list. Do not run tests. Do not commit. Do not comment on or close the issue. Do not
apply the policy. Append the scratchpad entry. Write `proposed-reply.md`, move this
directory to `.llm/plans/completed/422-cluster-egress-policy/`, and give the operator
fish-safe git commands plus the reminder to push the GitOps branch. There is no test
command. The close recommendation is only for after `develop`.
