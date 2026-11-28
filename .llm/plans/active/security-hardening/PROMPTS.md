# Security hardening prompts 1–10

This set is finished. Do not paste these prompts. Issues 414 through 423 are closed.
Shipped work is commented on the issue. 415, 416, and 422 were closed with no product
change.

## 1 — Session tokens accept only HS256

Issue 419. Directory `419-session-jwt-hs256`.

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/419-session-jwt-hs256/01-pin-hs256.md

Stay in this checkout on the current branch. Do not create a worktree.

Before the first product edit, search open issues again for session JWT algorithm
pinning. If a different open issue covers the same behavior, stop and use that issue.

Do not run tests. Do not commit, push, or comment on or close the issue.

When the work is done, write proposed-reply.md from the plan's Ticket reply, move this
directory to .llm/plans/completed/419-session-jwt-hs256/, and end with the Root tab
command below plus fish-safe git commands. Say that posting the reply and closing
issue 419 waits until the change is on develop. Do not run gh issue comment or
gh issue close.

Root tab:

npm run test -w @podverse/api -- src/lib/auth/sessionTokens.test.ts
```

## 2 — Untrusted server fetches use one outbound policy

Issue 414. Directory `414-outbound-fetch-policy`.

**Cursor model:** Opus 5.5 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/414-outbound-fetch-policy/01-one-outbound-policy.md

Stay in this checkout on the current branch. Do not create a worktree.

Before the first product edit, search open issues again for untrusted outbound fetches.
If a different open issue covers the same behavior, stop and use that issue.

Do not run tests. Do not commit, push, or comment on or close the issue.

When the work is done, write proposed-reply.md from the plan's Ticket reply, move this
directory to .llm/plans/completed/414-outbound-fetch-policy/, and end with the Root tab
commands below plus fish-safe git commands. Say that posting the reply and closing
issue 414 waits until the change is on develop. Do not run gh issue comment or
gh issue close.

Root tab:

npm run test -w @podverse/helpers-requests
npm run test -w @podverse/web -- src/app/api/proxy
npm run test -w @podverse/web -- src/utils/media/resolveMediaRedirect.test.ts
npm run test -w @podverse/workers
```

## 3 — Stored descriptions reject markup outside the allowlist

Issue 423. Directory `423-description-markup-corpus`.

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/423-description-markup-corpus/01-extend-corpus.md

Stay in this checkout on the current branch. Do not create a worktree.

Before the first product edit, search open issues again for description markup allowlist
tests. If a different open issue covers the same behavior, stop and use that issue.

Do not run tests. Do not commit, push, or comment on or close the issue.

When the work is done, write proposed-reply.md from the plan's Ticket reply, move this
directory to .llm/plans/completed/423-description-markup-corpus/, and end with the Root
tab command below plus fish-safe git commands. Say that posting the reply and closing
issue 423 waits until the change is on develop. Do not run gh issue comment or
gh issue close.

Root tab:

npm run test -w @podverse/helpers -- src/lib/descriptionIngest.test.ts
```

## 4 — GitHub Actions run from pinned commits

Issue 421. Directory `421-actions-pin-sha`.

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/421-actions-pin-sha/01-pin-action-shas.md

Stay in this checkout on the current branch. Do not create a worktree.

Before the first product edit, search open issues again for pinning GitHub Actions to
commits. If a different open issue covers the same behavior, stop and use that issue.

Do not run tests. Do not commit, push, or comment on or close the issue.

When the work is done, write proposed-reply.md from the plan's Ticket reply, move this
directory to .llm/plans/completed/421-actions-pin-sha/, and end with fish-safe git
commands. There is no verification command. Say that posting the reply and closing
issue 421 waits until the change is on develop. Do not run gh issue comment or
gh issue close.
```

## 5 — Cookie-authenticated writes require a same-site header

Issue 420. Directory `420-cookie-write-header`.

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/420-cookie-write-header/01-cookie-write-header.md

Stay in this checkout on the current branch. Do not create a worktree.

Before the first product edit, search open issues again for cookie-authenticated write
protection. If a different open issue covers the same behavior, stop and use that issue.

Do not run tests. Do not commit, push, or comment on or close the issue.

When the work is done, write proposed-reply.md from the plan's Ticket reply, move this
directory to .llm/plans/completed/420-cookie-write-header/, and end with the Root tab
commands below plus fish-safe git commands. Say that posting the reply and closing
issue 420 waits until the change is on develop. Do not run gh issue comment or
gh issue close.

Root tab:

npm run test -w @podverse/http-request-core
npm run test -w @podverse/helpers -- src/lib
npm run test:e2e:api

Narrow the API command to the auth integration files you changed if the full API suite
is more than this issue needs. Name the files in the final message. API integration tests
need the test database and Valkey (make test_deps from the Root tab when they are not
already up).
```

## 6 — API reference pages do not load a third-party script

Issue 418. Directory `418-api-docs-exposure`. The first turn asks a question and stops.
Answer in that same chat.

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/418-api-docs-exposure/01-docs-exposure.md

Stay in this checkout on the current branch. Do not create a worktree.

Ask the operator question in the plan and stop this turn before any product edit.
Do not choose the answer. Under plan-runner, report RUNNER-STATUS: BLOCKED with the
question. When the operator answers, continue in this chat and implement that answer.

Before the first product edit, search open issues again for API docs exposure. If a
different open issue covers the same behavior, stop and use that issue.

Do not run tests. Do not commit, push, or comment on or close the issue.

When the work is done, write proposed-reply.md from the plan's Ticket reply that matches
the answer, move this directory to .llm/plans/completed/418-api-docs-exposure/, and end
with the Root tab commands below plus fish-safe git commands. Say that posting the reply
and closing issue 418 waits until the change is on develop. Do not run gh issue comment
or gh issue close.

Root tab:

npm run test -w @podverse/api -- src/lib/docs/registerSwaggerDocs.test.ts
npm run test -w @podverse/management-api -- src/lib/docs

If the management docs test landed in an integration file instead, name that file and
give its command. Integration tests need make test_deps from the Root tab when the
test database and Valkey are not already up.
```

## 7 — HTTP rate limits share one counter

Dropped. [Issue 415](https://github.com/podverse/podverse/issues/415) is closed. Do not
paste a prompt for this step. Counters stay in process memory. The API and the web app
each run as one pod, so a shared store does not change the limit. The plan is in
`.llm/plans/completed/415-shared-rate-limits/`.

## 8 — An account locks after repeated failed passwords

Dropped. [Issue 416](https://github.com/podverse/podverse/issues/416) is closed. Do not
paste a prompt for this step. Login stays limited per address, and a correct password
still starts a session. The plan is in
`.llm/plans/completed/416-account-login-lock/`.

## 9 — Cluster workloads cannot open arbitrary outbound connections

Dropped. [Issue 422](https://github.com/podverse/podverse/issues/422) is closed. Do not
paste a prompt for this step. No NetworkPolicy. The plan is in
`.llm/plans/completed/422-cluster-egress-policy/`.

## 10 — An account can require a second factor at login

Shipped. Do not paste a prompt for this step. The plan, including `proposed-reply.md`,
is in `.llm/plans/completed/417-second-factor/`. Issue 417 is closed.
