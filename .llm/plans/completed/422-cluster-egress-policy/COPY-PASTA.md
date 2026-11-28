# 422 — Dropped

Issue 422 is closed. Do not paste the prompt below. No NetworkPolicy.

# 422 — Cluster workloads cannot open arbitrary outbound connections

Stay in this checkout on the current branch. Do not open a worktree. Do not start another
security directory in this chat.

The first turn builds a host list and stops. Confirm or edit that list in the same chat.
The policy is written only after that.

**Optional — run the set unattended (Root tab):**
`node ../plan-runner/run-plan-set.mjs 422-cluster-egress-policy`. It stops at the list;
resume that agent with the confirmed hosts.

## Phase 1

- [ ] **01 — Default-deny egress after the operator confirms the hosts**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/422-cluster-egress-policy/01-egress-policy.md

Stay in this checkout on the current branch. Do not create a worktree.

Inventory outbound hosts as the plan says and stop this turn before writing a
NetworkPolicy. Under plan-runner, report RUNNER-STATUS: BLOCKED with the list and the
question. When the operator confirms the list, continue in this chat and write only
that list.

Before writing the policy, search open issues again for cluster egress policy. If a
different open issue covers the same behavior, stop and use that issue.

Do not run tests. Do not run kubectl. Do not commit, push, or comment on or close the
issue.

When the work is done, write proposed-reply.md from the plan's Ticket reply, move this
directory to .llm/plans/completed/422-cluster-egress-policy/, and end with fish-safe git
commands. There is no verification command. Tell the operator to push the GitOps branch
for the cluster to sync, and not to apply the policy from a laptop. Say that posting
the reply and closing issue 422 waits until the change is on develop. Do not run
gh issue comment or gh issue close.
```
