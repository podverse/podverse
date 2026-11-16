# Request — Android v4 storage spike

Run the Android half of the signed-out storage spike in
[08 § Storage key spike](/docs/proposals/v4-to-v5-migration/08-mobile-first-launch-migration.md)
and the feed-list field spike in the same section. iOS 18.2 already passed both. Android was
not run.

This set is not part of the local migration rehearsal. Do not start it while
`v4RunFullRehearsal` is running.

The measurement uses one manual emulator, a v4 debug install, then a private v5 debug install
over that same app. Record counts only. Leave doc 08 unchanged for the operator to update after
review.
