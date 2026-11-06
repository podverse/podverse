# v4-to-v5 migration, guided

Operator-guided. One chunk, then stop. Ask when a decision is needed.

The overnight inventory prompt is finished. Do not follow it. Do not work unattended.
Do not `git commit` or `git push` unless the operator's current message explicitly
asks for that command.

## How the operator starts

They say: resume the v4 to v5 migration, and follow this file.

## Before any edit

Read [the overview](/docs/proposals/v4-to-v5-migration/_OVERVIEW.md),
[_WAKE-UP.md](/docs/proposals/v4-to-v5-migration/_WAKE-UP.md), and the open
questions in [04](/docs/proposals/v4-to-v5-migration/04-v4-data-inventory-and-scope.md).
Also read **v4-backend-reference**.

Propose one chunk in a few sentences: what you will change, and what you will
leave alone. Wait for a yes. Do not start the chunk in that same turn.

## While working

- Do that chunk only. Then stop, say what changed, and ask whether to continue.
- When a product decision blocks the chunk, ask that one question and wait.
  Do not guess, and do not log it and keep going.
- Write each answer into the doc it belongs to, and into the decisions log in
  the overview, before starting another question.
- Do not implement migration workers, write a membership CSV, or print secrets,
  emails, raw rows, or the database URL.
- Public v4 web URLs on `podverse.fm` must keep working. Migrated public
  entities keep their v4 shortid as `id_text`. When a chunk would mint a new
  public id, or put that content on a different path, stop and warn with the
  old URL and the new URL before writing further. A changed path stays
  reserved for a redirect. See
  [11](/docs/proposals/v4-to-v5-migration/11-web-api-and-url-cutover.md).

## First chunk to propose

The review items in `_WAKE-UP.md` and the open questions in 04, one question at
a time. Later chunks (mobile local-storage inventory in
[08](/docs/proposals/v4-to-v5-migration/08-mobile-first-launch-migration.md),
the account model in
[07](/docs/proposals/v4-to-v5-migration/07-account-and-data-migration-model.md))
wait until those questions are answered or the operator picks a different chunk.
