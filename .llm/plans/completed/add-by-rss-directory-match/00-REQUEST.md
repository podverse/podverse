# Request — Add by RSS directory match

Recorded 2026-11-13. The operator's words, unedited, then the answers to the follow-up form.

## Request

> I have been concerned about what we will do for non-logged-in v4 users when the v5 migration
> happens because I have been concerned that they will lose subscriptions when the migration
> happens, and there may be various plans and proposals related to this. I am thinking that the
> simple solution would be that we proceed to match the users. The non-logged-in users'
> subscriptions with the feeds that we know that we can find are already parsed and in our
> database, and their device will migrate to using those, but then, for the outliers where they're
> subscribed to something that did not make it into the v5 migrated database yet, then those will
> simply convert to being ads by RSS feeds for that non-logged-in user. So, hopefully, this will
> prevent dramatically the likelihood of them experiencing missing feeds after the v5 migration is
> complete and upgrade. Furthermore, if it doesn't work this way already, I think we should have an
> auto correcting behavior where if a user attempts to add or refresh an ad by RSS feed; we should
> first do a lookup in our API to see if that feed corresponds with an exact match, excluding any
> characters that are irrelevant for URL matching purposes. If that feed is found, then we should
> convert the local user's AdByRSS to a subscription to what is in our API rather than have them
> continue to use the AdByRSS version. We want this preference because the feeds that are within
> our database will have enriched functionality compared to the add by RSS feeds which have some
> limitations. So, we don't want them to persist with using an add by RSS version if it is not
> necessary because we have that version already in our database. Perhaps this will be a way of
> self-healing over time as v4 to v5 migrated users may start with many of their, if they are a
> non-logged-in user, they may start with many. Feeds and add by RSS mode. However, they may get
> added gradually over time and get a better experience. We still want to encourage them to back up
> an OPML file before proceeding with the migration. Create and save locally plans and update
> proposals and documentation and anything else you think is important for this purpose. And give
> adequate instructions so that a Grok 4.7 model will be able to complete this work. We do not need
> a work tree for this. We just want you to create and save plan files locally, which we can run
> later to implement anything that is needed for this process. Also, take a look at existing plans
> that have not been completed and decide if those should be updated based on this direction we are
> taking things or if they can stay the same.

## Answers

- **Where the feed URL comes from (v4 carryover):** both. The phone's cached v4
  `SUBSCRIBED_PODCASTS` `feedUrls[0].url` first; the legacy lookup also returns the v4 authority
  feed URL for eligible shows v5 has not parsed. (Set `v4-signed-out-carryover`.)
- **Shows v4 marked ineligible:** spam and takedown are dropped and counted, never Add by RSS.
  Non-public shows become Add by RSS when a URL is known. (Set `v4-signed-out-carryover`.)
- **Where the directory match runs:** everywhere. Signed-out mobile on the device; signed-in
  mobile and the website through the server, which converts the account's follow so every device
  agrees.
- **Data attached to the feed:** "It sounds like we need remapping, but we also may need updates
  to the user's tables, like playlist items, or history, or queue. So make sure that is accounted
  for so all the relevant data maps correctly."
- **What the person sees:** quiet. No prompt; the feed simply shows as a regular podcast, and the
  switch is logged.
- **OPML backup:** both. Store listing and release notes ask for Export OPML in v4 before
  updating, and the Continue Migration screen is built after the storage spike passes. (Set
  `v4-signed-out-carryover`.)

No worktree. The set runs in this checkout, on the current branch.
