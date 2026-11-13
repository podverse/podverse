# v4-to-v5 migration, guided

Operator-guided. One chunk, then stop. Ask when a decision is needed.

The overnight inventory prompt is finished. Do not follow it. Do not work unattended.
Do not `git commit` or `git push` unless the operator's current message explicitly
asks for that command.

## How the operator starts

They say: resume the v4 to v5 migration, and follow this file.

## Before any edit

Read [the overview](/docs/proposals/v4-to-v5-migration/_OVERVIEW.md),
[_WAKE-UP.md](/docs/proposals/v4-to-v5-migration/_WAKE-UP.md), section 6 of
[15](/docs/proposals/v4-to-v5-migration/15-near-term-rehearsal-checklist.md), and
[16](/docs/proposals/v4-to-v5-migration/16-full-local-migration-rehearsal.md).
The questions in 04 and 07 are decided. Also read **v4-backend-reference**.

Propose one chunk in a few sentences: what you will change, and what you will
leave alone. Wait for a yes. Do not start the chunk in that same turn.

## While working

- Do that chunk only. Then stop, say what changed, and ask whether to continue.
- When a product decision blocks the chunk, ask that one question and wait.
  Do not guess, and do not log it and keep going.
- Write each answer into the doc it belongs to, and into the decisions log in
  the overview, before starting another question.
- The next chunk is the first unchecked item in
  [15](/docs/proposals/v4-to-v5-migration/15-near-term-rehearsal-checklist.md),
  section 6. `v4SeedAccountIdentity`, the `v4CopyAccountLibrary` dry run, and
  the `v4SeedAccountCatalog` command are already built. Without `--dry-run`
  the catalog command writes local feeds. It refuses a non-local database.
  Do not start the library write before the catalog seed for that account
  has been parsed.
- Do not write a membership CSV, and do not print secrets, emails, raw rows,
  or the database URL.
- Public v4 web URLs on `podverse.fm` must keep working. Migrated public
  entities keep their v4 shortid as `id_text`. When a chunk would mint a new
  public id, or put that content on a different path, stop and warn with the
  old URL and the new URL before writing further. A changed path stays
  reserved for a redirect. See
  [11](/docs/proposals/v4-to-v5-migration/11-web-api-and-url-cutover.md).

## First chunk to propose

Section 6 of
[15](/docs/proposals/v4-to-v5-migration/15-near-term-rehearsal-checklist.md),
the first unchecked item. The review questions in `_WAKE-UP.md`, 04, and 07
are decided, including the account caps. Do not reopen them. The full local
rehearsal stages run from the agent prompt that plan set writes; a stage
reads `summary.json`, not the full error log.
