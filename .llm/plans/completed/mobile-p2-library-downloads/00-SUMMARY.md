# Phase 2 — Library Downloads + Settings storage

Area: **P2.1.5 Library (Downloads)** + Settings slice of **P2.1.10**.

Detail docs: `731`–`737` under
`docs/proposals/mobile/_master-plan_/phase-2/details/`.

Source: nextgen product feedback on the current Downloads screen (not a legacy port).

## Locked decisions

1. **No redundant screen titles** — drop in-body headings that repeat the stack title (Downloads,
   Add-by-RSS feed list). Keep entity names and real section headings.
2. **Settings owns storage** — More → Settings → Downloads: four bars, limit, two auto-free
   toggles, danger Delete all + confirm.
3. **Delete all** deletes local media files and index rows; confirm required; settings only.
4. **Clear all finished** sets `dismissedFromList` — files stay, stay playable, still count toward
   storage and Home counts. No orphans.
5. **Four display-only bars** — Device, Downloaded media, App data, Cache. No Clear cache this
   pass (737).
6. **Limit** — default 10 GB; options 1/2/5/10/20/50 GB / Unlimited.
7. **Two auto-free toggles** — (1) limit reached, (2) device free space under 1 GB.
8. **Downloads list is a monitor** — Pause all / Resume all; sections In progress / Failed /
   Completed; no Play; swipe to Remove; tap pauses/resumes or opens episode / retries.
9. **Rows** — art, channel title, item title, status, ProgressTrack while transferring. Persist
   channel id/title on the download row.
10. **Concurrency 5** — we own the cap; OS does not throttle Expo downloads for us.
11. **Global activity banner** — download progress in the SyncProgressBar slot; downloads do **not**
    join the serial sync queue.
12. **Home Podcasts footer** — “Downloaded, not subscribed” for channels with complete downloads
    that are not subscribed.

## Out of scope

- Per-channel auto-download (728)
- Playing from Downloads list
- Web / account-synced storage prefs
- Clear cache / expo-image precision / user concurrency (737)
