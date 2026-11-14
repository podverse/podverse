## v4 library copy logs the unshipped directory-follow tier

- Surfaces: workers
- Change: `v4CopyAccountLibrary` logs the directory-follow tier it would store (1000, 2000, 3000, 4000, 5000, or 10000) and does not write a column. A count past 10000 copies no directory follows and reports needs_operator. A count of 500 or fewer is copied with no tier.
- Who notices: operators running the local v4 library copy
- Operator steps: none

## v4 library copy leaves an over-limit playlist for an operator

- Surfaces: workers
- Change: `v4CopyAccountLibrary` skips a playlist that would hold more than 10000 resources, reports that playlist as needs_operator, and copies the account's other playlists. It does not stop at 10000 members.
- Who notices: operators running the local v4 library copy
- Operator steps: none

## Local full migration rehearsal

- Surfaces: workers
- Change: `v4RunFullRehearsal` copies a stage of v4 accounts into the local database through identity, catalog, library, replay, membership, and a per-account check. It refuses a non-local database, dumps that database before each phase, restores the clean image for sample and full, and stops when more than 5% of the last 200 accounts fail in one phase.
- Who notices: operators running the local migration rehearsal
- Operator steps: start the parser again after `rehearsal restore=finished` so the catalog wait can finish. `--stage full` reads `WEB_DOMAIN` for the public path sample. Optional `V4_REHEARSAL_PASSWORD` checks sign-in for the rehearsal account only.

## Account phase status

- Surfaces: k8s, workers
- Change: App migration `0010_account_phase_status.sql` adds `account_phase_status`. One row per v4 user and phase (`identity`, `catalog`, `library`, `replay`, `membership`, `verify`) stores `pending`, `done`, `failed`, `deferred`, or `needs_operator`. `API_EXPECTED_MIGRATION_FILENAME` advances to that file. The management marker stays. The rehearsal runner resumes from these rows and the same rows are what a later copied / remaining / failed review counts.
- Who notices: a deploy waits until this migration is applied. No screen change.
- Operator steps: none beyond the usual migration apply

## v4 library copy keeps a failed group from rolling back the others

- Surfaces: workers
- Change: `v4CopyAccountLibrary` commits directory follows, Add by RSS, archived items, clips, playlists, and playback separately. A database refusal in one group is returned as an error class and the other groups stay written. `v4_library_copied_at` is set only when every group committed and none was left for an operator.
- Who notices: operators running the local v4 library copy
- Operator steps: none

## v4 library copy writes an Add by RSS tier

- Surfaces: workers
- Change: `v4CopyAccountLibrary` sets `max_add_by_rss_feeds` to the smallest tier that covers that account's Add by RSS count (200, 300, 400, 500, 1000, or 10000) when the count is over 100 and the stored number is missing or below the count, then copies the feeds. When the count is 100 or fewer and the stored number is below that count, the column is set to null and 100 is not written, and the feeds still copy. A stored number that already covers the count stays, including a number above 10000, and the feeds copy. A count past 10000 with no covering stored number copies no Add by RSS feeds and reports needs_operator. The copy never writes a number above 10000.
- Who notices: operators running the local v4 library copy
- Operator steps: none
