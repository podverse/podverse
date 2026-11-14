# Request

## Request

Do our plans include running a full migration for all of the users into localhost? Because it should. That is a very critical step. And we want to run it in a way where I can give that task to an agent to do. And if an error happens along the way, it can flag and save those errors. To a log file, which maybe should be saved somewhere that it won't be committed because we want to not accidentally reveal personally identifying information. But we do want to identify as we migrate any issues that we uncover as we try migrating accounts. We also, however, don't want to stream an absurd amount of text to the LLM agent and incur unnecessary costs, but rather would like the LLM to be able to run the tasks perhaps in some way that you recommend that is most efficient, where you can still monitor the statistics of what is successful and what isn't. And also log any errors that surface during that process. And I'm not sure how to do this, but it might need to be a phased approach of sorts. And perhaps it begins with a preliminary run of a small set before we run the full set after that. But it is critical that we maintain compatibility after the migration as much as possible. So we need a thorough process like this to be done locally.

I want you to select whatever answers for the open decision that you think are best. Unless you really are unsure, then ask the operator how to proceed. And also make sure that you understand that the snapshot that we are testing with is a bit out of date with what the final database will be. So we can't anticipate things like which user IDs go over certain limits that need to be handled in a special way. However, I think if we apply the right rules in this process, then we can conditionally detect which accounts need which rules. Ask me if you have any questions.

Will this full local migration process have a way of resolving issues that are obvious to the agent on how to fix? We want, when an issue is obvious, how the agent should fix it. We want the agent to just go ahead and fix the issue. But when an issue is not obvious, we would like, if possible, for the agent to make note of it as a deferred task for later, which gets saved in a file somewhere so we can resolve those deferred tasks when the operator is available. My plan is to run this long operation overnight, have the agent do this work, and after it completes any deferred tasks, the operator can work with the agent to decide how to fix. Ask if you have questions? Tell me if you are ready for me to run the plan command.

Also, can we exclusively use Grok 4.7 for this task? And can we use lower thinking? We have run out of Opus and higher tier models, but we have a lot of tokens available for Grok. Make sure the plan knows that we should only be using Grok.

Also, when I say lower thinking, I don't mean the lowest, but rather whatever thinking level you think is sufficient given the type of task that we'll be performing. Whatever the lowest thinking level is that you are confident will be able to handle the task is the one we should use for that task. If you think extra high thinking is necessary from some tasks, you can use it, but we want to strive to use whatever the lowest available thinking is that can handle the task reliably.

## Operator answers

The account-cap decision is settled. The operator said to choose it, and the choice is written in `docs/proposals/v4-to-v5-migration/07-account-and-data-migration-model.md` under "Account caps v4 did not have". Do not reopen it.

- An account over a v5 default keeps its whole v4 library. The copy writes the smallest tier that covers the count, chosen from that account's counts at copy time. No id list is fixed from the snapshot.
- Add by RSS tiers: 200, 300, 400, 500, 1000, 10000. Directory-follow tiers: 1000, 2000, 3000, 4000, 5000, 10000. An account at or under the default gets no override.
- Past 10,000, that group is `needs_operator` and is not copied. Nothing is truncated. Migration never writes Unlimited. The account's other groups still copy.
- After the copy, the tier is the cap. Removing rows does not lower it.
- The directory-follow cap is not shipped. When it ships, it assigns the same tier to every existing account already over 500.
- A cap with no per-account override, including the 10,000 resources per playlist trigger, is `needs_operator` for that group. Any other refusal while copying a row is an error class. Nothing is swallowed.
- The snapshot is older than the database the real copy reads. Pilot membership is picked by rule when the stage starts. Counts in the docs are examples.

The rehearsal shape is settled in `docs/proposals/v4-to-v5-migration/16-full-local-migration-rehearsal.md`. Plan that. Do not redesign it.

- Phases, in order, across every account in the stage: preflight with a local database dump, identity, catalog seed and parse until settled, library copy, replay until a pass resolves nothing new, membership, then a per-account check.
- An account passes when every v4 row is written, pending, or dropped for an allowed reason; clips and playlist members are never dropped; the bcrypt hash matches byte for byte; public v4 ids still resolve; membership matches; caps did not cut a library.
- Stages: about 100 accounts picked by rule, then about 1,000 at random on a clean database, then every account on a refreshed copy and a clean database, then the full stage once more on a newer copy before go-live.
- Logs go to `.artifacts/v4-full-rehearsal/<run-id>/`, which is gitignored. No email, name, password hash, raw row, or database URL. The agent reads `summary.json` and up to three example lines of one error class. It does not read the full log.
- The runner stops itself when more than 5% of the last 200 accounts fail in one phase.
- Each account's status per phase lives in the local app database, and that same record is what the end-of-grace batch and the operator's daily review will use.

Overnight fixes and deferred tasks are settled in doc 16, under "How an agent runs it". Do not reopen them.

- A class is obvious when the decided docs already say what the row should become, the change is in the migration commands or a helper they call, the same fix covers the whole class, and the fix does not drop a clip or playlist member, change a public id or path, truncate a library, write Unlimited, or add a database migration. The agent makes that fix and retries the accounts in that class.
- Anything else is appended to `.artifacts/v4-full-rehearsal/<run-id>/deferred.md` (class, count, what it saw, why it was not fixed, three example v4 ids). The agent does not stop to ask, and it does not commit. A class already deferred is counted and not investigated again.
- Fixes the agent did make go to `fixes.md` in that same folder. Both files are gitignored because they name v4 ids. In the morning the operator decides each deferred entry.
- One prompt runs the stages in order. A deferred class does not stop the next stage.

Models are settled. Opus and Codex are unavailable. This overrides the model column of the table in the abcplan skill and in copy-pasta-recommend-model for this set only. The reasoning column of that table still applies.

- Every planning step and every implementation prompt uses **Cursor Grok 4.7** only. Do not name Opus 5.5 or Codex 5.3. A stalled prompt stays on Grok and is rerun one reasoning level higher. It is not moved to another model.
- Reasoning is the lowest level that can do that prompt reliably: low, medium, high, or extra high. Extra high is allowed when the reasoning table calls for it (a database migration, resume and idempotency, or a cap-tier write). Do not put the whole set on one level.
- Plans resolve every either/or and name exact paths, because Grok follows the plan instead of designing it.

## Glossary

- v4, OGen, Legacy: current production (`podverse-api`, `podverse-rn`).
- v5, NextGen: this monorepo.
- The snapshot: the prod-copy database named only by `V4_DATABASE_URL`.

## Orientation

- `docs/proposals/v4-to-v5-migration/16-full-local-migration-rehearsal.md` — the rehearsal this set builds. Start here.
- `docs/proposals/v4-to-v5-migration/15-near-term-rehearsal-checklist.md` — section 6 is the checklist. Section 5 is the finished one-account rehearsal for v4 id `eFv5NFx`.
- `docs/proposals/v4-to-v5-migration/07-account-and-data-migration-model.md` — the cap rules, under "Account caps v4 did not have".
- `docs/proposals/v4-to-v5-migration/05-id-mapping-and-catalog-seeding.md` — "Migration resilience" (`legacy_pending_row`, `v4ReplayLegacyRows`) and "Launch queue".
- `apps/workers/src/commands/orm/v4Identity/seedAccountIdentity.ts` — one account, requires `--v4-id`, refuses a non-local database on apply.
- `apps/workers/src/commands/orm/v4Catalog/seedAccountCatalog.ts` — one account's shows.
- `apps/workers/src/commands/orm/v4Library/copyAccountLibrary.ts` — one account's library. Does not write a cap tier today.
- `apps/workers/src/commands/orm/v4Library/replayLegacyRows.ts` — the one command that already takes `--limit`.
- `.llm/plans/active/account-add-by-rss-cap-500.md` and `.llm/plans/active/account-follow-cap-5000.md` — draft tier lists. Doc 07 wins where they still say a library past 10,000 is cut to 10,000.
- `.artifacts/` is gitignored (`.gitignore`).

### Review of the first planning pass

The operator settled the seven open choices one at a time. Where an answer below conflicts with a planner decision in `00-SUMMARY.md` or with a numbered plan, the answer below wins. Every other decision in that section stands as written.

**Stored Add by RSS cap under the count.** A stored `max_add_by_rss_feeds` that is under the feed count, and at or under 100, is cleared so the default of 100 applies, and the feeds still copy. This replaces the planner choice that left that stored number in place (plans 20 and 22).

Apply it as follows. A stored number that is already greater than or equal to the count stays, including a number above 10000, and the feeds copy. The copy still never writes a number above 10000 itself. When the count is at or under 100 and the stored number is below that count, set the column to null. Do not write 100. When the count is over 100 and the stored number is below the count, keep the existing raise: write the smallest tier that covers the count. Do not leave the default of 100 in place for a count the default does not cover.

**Stored cap already above 10000.** Accepted as planned. Leave the stored number and copy the feeds when it already covers the count.

**Morning list.** `needs_operator`, `email_case_left_out`, and `identity_not_done` are written to `deferred.md`. Their account status stays as it is, and the agent does not investigate them. This replaces the planner choice that skipped those three names (plan 90). The runner still does not write that file. The overnight prompt does.

**`parse_failed`.** Accepted as planned. Write it to `deferred.md` and do not change account status. The id on that line is a podcast id.

**Catalog wait.** Accepted as planned. Wait until every mapped feed is settled, including the retry ladder, with no timeout.

**Library left.** Accepted as planned. Left is every library row that is not `done`, so a failed copy stays in that backlog. Failed remains its own count.

**Self-follow.** Accepted as planned. A follow of the account's own id with no v5 follow row is an allowed omission, and the account can still pass.
