# Dropped

The operator closed https://github.com/podverse/podverse/issues/416 with no product change.
Do not implement this plan. Login stays limited per address. A correct password still
starts a session.

# An account locks after repeated failed passwords

**Cursor model:** Opus 5.5 · **Reasoning:** high

## Issue

https://github.com/podverse/podverse/issues/416

## Rows

- **R1** Repeated wrong passwords for one account stop password login for that account until the lock ends or is cleared.

## Runs after

none

Finish this before 417. Both edit login.

## Operator questions

Ask these in the chat and stop the turn before any product edit. If this step is under
plan-runner, report `RUNNER-STATUS: BLOCKED` with the same questions. A block of answers
that accepts the recommendation is enough. Do not start coding on the recommendation
alone.

Recommendation, so the operator can accept or replace it:

- 10 failed password checks for one account inside 15 minutes.
- The response body matches a wrong password. A locked account is not labeled as locked.
- The counter lives in Valkey with a TTL of that window. No new table.
- A password reset clears the counter.
- There is no new management button. An operator who must unlock sooner deletes the
  Valkey key. Say so in the final message. Do not add a screen unless the answer asks
  for one.
- A correct password while the counter is over the threshold does not start a session.
- The existing per-address login limit stays.

Questions, if they do not accept the block:

1. How many failures, and in what window?
2. Same response text as a wrong password, or a distinct lock message?
3. Valkey TTL, or a Postgres column?
4. Does password reset clear it?
5. Does management get a control to clear it?
6. Does a correct password during the lock start a session?

## Alpha GitOps (k.podcastdj.com)

None, if the counter stays in Valkey. Alpha API already has `KEYVALDB_HOST=podverse-keyvaldb`
and the `podverse-keyvaldb-opaque` secret. Do not add a table, a backfill, or a logout.
Existing sessions stay valid. A locked account waits out the window or uses password
reset. Two internal users do not need a migration job. If the operator instead chooses a
Postgres column, say so in the final message. That is the only path that needs a migration,
and it still does not need a k.podcastdj.com env edit.

## Files

Filled in after the answer. Expected, if the recommendation is accepted:

- The login handler behind `POST /auth/login` in `apps/api/src/routes/auth.ts` and the
  authenticate function it calls
- The Valkey client the API already has (`apps/api/src/lib/keyvaldb/keyvaldb.ts`)
- The password-reset success path, to delete the counter
- `apps/api/src/test/auth.test.ts`

No migration if the counter is in Valkey. No mobile or web copy change if the response
text matches a wrong password.

## Tests

API integration in the auth tests:

- Failures under the threshold still return the wrong-password response, and a later
  correct password starts a session.
- Once the threshold is passed, a correct password does not start a session, and the
  response matches what the operator chose.
- After the clear path (reset, or TTL in a unit test of the key), a correct password
  works again.
- Attempts against two accounts do not share a counter.
- The per-address 429 still happens when that limit is hit first.

## Release scratchpad

Append, with the numbers the operator chose:

```markdown
## Repeated wrong passwords lock the account

- Surfaces: api
- Change: too many failed passwords for one account stop password login for that account
  until the window ends or the lock is cleared. The per-address limit is unchanged.
- Who notices: someone who mistypes a password past the threshold, including from
  several addresses. The response text is whatever the operator chose.
- Operator steps: none when the counter is in Valkey and resets on its own. Name a
  management step here only if the answer added one.
```

## Work

There is no per-account failure counter today. `POST /auth/login` is limited per address
(`AUTH_LOGIN_MAX_PER_MINUTE`, default 5). Passwords use bcrypt.

Count a failure only when the account exists and the password check fails. An unknown
email does not create a counter that reveals the account. Do not log the password.

While locked, do not run the success path. Do not issue a cookie or a token.

Keep the address limiter. A flood from one address can still 429 before the account
counter trips.

## Ticket reply

Save as `proposed-reply.md`. Do not post it. After the change is on `develop`, post it
and close issue 416. Fill the numbers from the answer.

```text
Password login now stops for an account after too many wrong passwords, even when the
attempts come from different addresses. The per-address limit is still there. A correct
password during the lock does not sign in. The lock ends when its window does, or when
a password reset clears it, unless you chose a different clear path.
```

Adjust the last sentence to match the answer. Do not name files.

## Done

Search issue 416 again before the first product edit, which is after the operator
answers. Do not run tests. Do not commit. Do not comment on or close the issue. Append
the scratchpad entry. Write `proposed-reply.md`, move this directory to
`.llm/plans/completed/416-account-login-lock/`, and give the operator the verification
command from COPY-PASTA plus fish-safe git commands. The close recommendation is only
for after `develop`.
