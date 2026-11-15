# Request — v4 signed-out carryover

Recorded 2026-11-13. This set and `add-by-rss-directory-match` come from the same request; the
operator's words and the form answers are in
[`../../completed/add-by-rss-directory-match/00-REQUEST.md`](../../completed/add-by-rss-directory-match/00-REQUEST.md).

The parts this set carries:

> I have been concerned about what we will do for non-logged-in v4 users when the v5 migration
> happens because I have been concerned that they will lose subscriptions ... we proceed to match
> the users. The non-logged-in users' subscriptions with the feeds that we know that we can find
> are already parsed and in our database, and their device will migrate to using those, but then,
> for the outliers where they're subscribed to something that did not make it into the v5 migrated
> database yet, then those will simply convert to being ads by RSS feeds for that non-logged-in
> user. ... We still want to encourage them to back up an OPML file before proceeding with the
> migration.

Answers that apply here:

- **Feed URL source:** both — the phone's cached v4 `SUBSCRIBED_PODCASTS` `feedUrls[0].url`
  first, and the legacy lookup also returns the v4 authority feed URL for eligible shows not in v5.
- **Ineligible shows:** spam and takedown are dropped (counted, never Add by RSS). Non-public shows
  become Add by RSS when a URL is known.
- **OPML backup:** both — store listing and What's New text ask for Export OPML in v4 before
  updating (doc 10), and the Continue Migration screen is built once the field spike passes.
- **Attached data:** map everything that can be mapped (queue, history, playlists) — carried by
  the directory match set; this set adds the v4 library copy step.

No worktree. Runs in this checkout, after `add-by-rss-directory-match`.
