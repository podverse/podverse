# An account can require a second factor at login

**Cursor model:** Opus 5.5 · **Reasoning:** high

## Issue

https://github.com/podverse/podverse/issues/417

## Rows

- **R1** An account that turns the factor on cannot finish login with a password alone.

## Runs after

none

416 is closed and ships no login change. This plan does not include a failure counter.

## Operator questions

Ask these in the chat and stop the turn before any product edit. If this step is under
plan-runner, report `RUNNER-STATUS: BLOCKED` with the same questions. There is no
recommendation to implement in silence. An account with the factor off must keep today's
login. That part is settled. Everything else waits.

1. Which factor: passkey, a one-time code, or both?
2. Is it optional per account, or required for every account?
3. Do web and mobile ship in this change, or web first with mobile explicitly deferred?
4. How does a person recover when the factor is lost? Name who can reset it.
5. Is the factor asked on every login, or remembered on a device? If remembered, for how
   long, and is that memory a cookie, a token, or something else?

Settled, from the operator: ending existing sessions is acceptable. Alpha has two
internal users. They sign in again. Do not add a migration job to keep old sessions.

## Alpha GitOps (k.podcastdj.com)

No logout job and no backfill. If the chosen factor needs an origin or relying-party id,
the alpha values are `https://alpha.podcastdj.com` for the app and
`https://management.alpha.podcastdj.com` if management is in scope. Cookie domain is
already `.podcastdj.com` in `apps/podverse-alpha/api/source/api.env`. Write any new key
the code adds into the alpha env file for the process that reads it (`api.env`, and
`web-sidecar.env` or `management-web-sidecar.env` when the browser must see it). The
password and any private key stay in the existing secret pattern, not in git. The final
message names those keys and files. If the factor needs no new env, say that. Do not
edit k.podcastdj.com from this plan. Ship the API and the web images that show the new
step in one promotion, the same way a cookie-header change cannot roll the API alone.

If the operator says not to build this, stop. Do not write product code. Leave the issue
open and say so. Do not close it.

## Files

None until the answers exist. After the answers, list the files in the final message
before editing them. Expected shape, not a prescription:

- API login gains a step between a correct password and a session.
- The factor a person set is stored with the account. Secrets and private keys are not
  written to git. Follow **public-repo-no-secrets**.
- Web and, if the answer includes it, mobile show that step.
- An account with the factor off is unchanged.

A schema change uses a new linear migration. Do not edit a generated baseline by hand.
Follow the linear migration rule if a table is added.

## Tests

Written from the answers:

- Factor off: login matches today.
- Factor on: a correct password does not yield a session until the factor succeeds.
- A wrong factor does not yield a session.
- The recovery path the operator named.
- Web E2E only if the answer includes a web screen. Use the make report target for that
  spec, from the Root tab, in the final message. Do not run it in the chat.
- Mobile Maestro only if the answer includes mobile. Name the flow. Do not paste
  leave-running Metro commands into the verification block.

## Release scratchpad

Append only if product code shipped. Describe the factor the operator chose, who can
turn it on, and what a person does when they lose it. No entry when the operator
declines the work.

## Work

Today, login is a password, a session cookie on web, and bearer tokens on mobile. There
is no second factor.

After a correct password for an account with the factor on, the response is a pending
step, not a session. The pending step cannot call session routes. Turning the factor off
returns to today's login.

Do not make the factor required for every account unless the answer says so.

Do not log codes, passkey challenges, or recovery secrets.

## Ticket reply

Save as `proposed-reply.md` only when product code shipped. Do not post it. After the
change is on `develop`, post it and close issue 417. Describe the factor and that
accounts without it still sign in with a password. Do not name files.

If the operator declined the work, do not write a reply that claims it shipped. Leave
`proposed-reply.md` unwritten and say the issue stays open.

## Done

Search issue 417 again before the first product edit, which is after the operator
answers. Do not run tests. Do not commit. Do not comment on or close the issue. Append
a scratchpad entry only if product code shipped. When it shipped, write
`proposed-reply.md`, move this directory to `.llm/plans/completed/417-second-factor/`,
and give the operator the verification commands for the tests you added plus fish-safe
git commands. The close recommendation is only for after `develop`.

If the operator declined the work, leave this directory in `active/` and leave the
issue open.
