# v4 pilot findings — request

## Request

Run whatever you need to to get the information that you need to proceed so that we have a
successful v4 to v5 migration. If there are extreme outliers, I want you to investigate why they
are extreme outliers and let me know if there's anything suspicious about them. We generally want
to grandfather the outliers in, so we may need changes to allow for those outliers.

Tell me if I should run any commands or if. We have follow up work we need to do. Go ahead and
create those plan files for them locally.

If any issues are the result of the fact that this is a partial and not a full pilot, make sure
that our migrations are in reality able to handle a full migration and that this won't surface as
issues for our users when we migrate. Of course, however, if there are outliers, you should label
them, try to find good solutions for them, and let us know about them.

You may create a document if needed to track important findings for the operator to review. Any
plans you create should be created and saved locally.

## Earlier asks from the same session

These came up while the pilot ran and belong to this set:

- Record a meaningful reason when a feed parse fails. "We don't control the servers that these
  feeds come from... we still need a graceful way of handling those issues as they happen."
- The catalog wait took about 16 hours because failed feeds sat on an 11-day retry ladder.
- The rehearsal prompt tells the agent not to run the scheduled job runner, but the catalog wait
  needs it.
- One feed failed with `numeric field overflow` in item About parsing.

## Source

Pilot run `20261114T034901Z` on branch `docs/v4-to-v5-migration-inventory`. Findings and the
evidence behind every plan: [00-FINDINGS.md](00-FINDINGS.md).

## Glossary

- "AdByRSS", "add by RSS": Add by RSS.
- "grandfather": keep the v4 data the account already had, even past a v5 limit.
