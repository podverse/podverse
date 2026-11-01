---
name: abctestdeferred
description: Resolve every entry in abctestall-deferred.md, remove each one after it passes, and delete the file when empty. Use when the operator runs /abctestdeferred or says abctestdeferred, and in every step of an abctestdeferred plan-runner run.
---

# `abctestdeferred`

## When the operator invokes it

Do not work the entries in that chat. The queue runs under plan-runner: one fresh agent per
group of entries, one at a time, each on Cursor Grok 4.7 at the reasoning its template line
names, with Fast off. Reply with the command, labeled **Root**:

```bash
./scripts/abctest/run.sh deferred
```

Tell the operator, briefly:

- When a step has a question, the run stops and nothing else starts. Answer by continuing that
  same agent, which keeps its whole conversation:
  `./scripts/abctest/run.sh deferred --resume 'Your answer.'`
- Running the command again without `--resume` only reprints the question.
- When `.llm/plans/active/abctestall-deferred.md` names an iOS flow, leave `npm run mobile:dev:e2e`
  running in **Mobile E2E Metro** before the command. The command exits until port 8081 is that
  E2E bundle. A queue with no iOS flow starts without it.
- Each step's final message is saved in `.artifacts/plan-runner/<set>/`; the Close step's message
  is the summary.

When `.llm/plans/active/abctestall-deferred.md` is missing, say there is nothing deferred instead.

The steps are in [deferred-COPY-PASTA.md](/.cursor/prompts/abctest/deferred-COPY-PASTA.md). Step
01 groups the entries and adds one step per group; the runner reads the new steps before each
step starts. The rest of this skill is what each runner step follows.

## Runner steps

Work only the entries in `.llm/plans/active/abctestall-deferred.md` that your step names. Do not
start a full **abctestall** sweep. This step overrides the usual "do not run tests during agent
work" rule for those entries.

- Read the previous steps' final messages in `.artifacts/plan-runner/<set>/` first. An earlier
  group's fix may already have changed your entries.
- If none of your entries remain in the deferred file, an earlier step cleared them. Report
  `RUNNER-STATUS: DONE` without running anything.
- Finish with `RUNNER-STATUS: DONE` when every entry in the group is removed or still open with
  its evidence updated and no question pending.
- Finish with `RUNNER-STATUS: BLOCKED — <one-line question>` when § When you need the operator
  applies. The full question goes in the final message.

## Queue

Read the whole file before editing. If it is missing, say there is nothing deferred and stop.
If it exists and names no tests, delete it and stop.

Group entries that likely share a root cause (same control, same screen, same assertion family,
or the same copy). Order the groups so one fix can clear the most entries. Inside a group, start
with the entry whose evidence is clearest.

## Resolve

If an entry is one of the checks in **e2e-problematic-assertions**, delete that assertion if it is
still present, delete the entry, and do not investigate it.

Work one group at a time. Read that entry's command, assertion, what was already tried, and the
competing explanations before changing anything. Rerun the command recorded on the entry — the
narrowest one that covers it. The agent runs that command and starts any required services in
its own background shells. Use the same service rules as **abctestall** § Services and § iOS
Maestro: inspect listeners first, and do not kill an unidentified or operator-owned process.

Follow **abce2etestdebug** for how to read one E2E failure, and **mobile-test-economics** for
the two-hypothesis limit on a device assertion. Do not raise timeouts, add retries, weaken
assertions, or accept several outcomes as the first response.

Fix the product code or the test, whichever the evidence supports. Say which you chose and why.
A passing sibling does not clear an entry that was not rerun.

After a change, rerun every entry in the group that the change might have fixed. Also rerun any
entry in a later group whose failure the change plausibly touched (same component, fixture,
seed, or code path), and name those in your final message. Remove an entry from the file only
after its rerun passes. Leave the file's other entries in place.

Batch reruns into one command so servers start once: a comma-separated `SPEC=a,b,c` for
Playwright, or several file paths for Vitest. Maestro flows still run one at a time.

## When you need the operator

Ask when the next step needs the operator: the cause is still ambiguous, the fix is a product
decision, or only they can observe the device, a credential, or a screenshot you cannot read.

First finish the entries in your group that do not depend on the answer. Then report BLOCKED.
Name the competing explanations, what would distinguish them, and the exact observation or
action you need. Keep the unresolved entry in the file. Do not append a new deferral, and do not
delete an unresolved entry.

The runner starts nothing else until the operator resumes you, so later groups wait for the
answer.

A Maestro exit **78** is an environment block. Report BLOCKED and ask. Do not start the next
mobile flow on a device that failed to recover.

## Done

The Close step deletes `.llm/plans/active/abctestall-deferred.md` when no test entries remain.

It summarizes fixes (file, cause, code or test, rerun command, result), entries removed, entries
still open, and any question waiting on the operator. Do not call an entry fixed until its
post-fix rerun has passed.
