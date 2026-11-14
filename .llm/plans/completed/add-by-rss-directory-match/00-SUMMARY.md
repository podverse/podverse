# Add by RSS directory match — summary

Request: [00-REQUEST.md](00-REQUEST.md). Phases and models: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md)
and [COPY-PASTA.md](COPY-PASTA.md). Product rules: doc 08
[§ Add by RSS directory match](/docs/proposals/v4-to-v5-migration/08-mobile-first-launch-migration.md#add-by-rss-directory-match).

When someone adds or refreshes an Add by RSS feed whose URL matches a parsed, public, active
directory channel, the feed becomes a normal subscription to that channel. Queue, history, now
playing, playlists, playback positions, downloads, and seen state move to the directory episodes.
Signed out, the phone does this itself. Signed in, the server converts the account's follow and
every client applies the same move locally. Nothing asks the person; the switch is logged.

This set ships on its own. The `v4-signed-out-carryover` set runs after it and reuses the match
route and the mobile promotion code.

## Requirement ledger

- **R1** "if a user attempts to add ... an ad by RSS feed; we should first do a lookup in our API
  to see if that feed corresponds with an exact match" — Plan: 01, 02, 03, 04, 05
- **R2** "if a user attempts to ... refresh an ad by RSS feed" (same lookup) — Plan: 01, 03, 04, 05
- **R3** "excluding any characters that are irrelevant for URL matching purposes" — Plan: 01
- **R4** "convert the local user's AdByRSS to a subscription to what is in our API" — Plan: 02, 03,
  04, 05
- **R5** "we may need updates to the user's tables, like playlist items, or history, or queue. So
  make sure that is accounted for so all the relevant data maps correctly." — Plan: 02 (server
  queue and playlist rows), 03 (device downloads, playback, outbox, seen, live, auto-download),
  04 (signed-in device caches)
- **R6** "self-healing over time" — Plan: 03 and 04 (every refresh), 05 (web refresh)
- **R7** Answer: everywhere — signed-out mobile on the device; signed-in mobile and web through
  the server — Plan: 02, 03, 04, 05
- **R8** Answer: quiet, logged — Plan: 02 (count-only API log), 03 and 04 (device log entry)
- **R9** "update proposals and documentation" — Plan: 06 (feature docs; the proposals were
  updated while planning)

## Settled decisions

These are decided. Plans follow them; do not reopen them during implementation.

1. **Match rule.** Exact URL after canonicalization. Ignored: `http` vs `https`, host case, default
   port, fragment, userinfo, and a trailing slash on a non-root path. Kept: path case, query
   string, and `www.`. A URL with userinfo or a feed marked `requires_credentials` never matches.
2. **Guid guard.** When the client knows the feed's `podcast:guid` and the channel has a different
   `podcast_guid`, it is not a match. A guid alone, without a URL match, is not a match.
3. **Eligible channels.** The same filters as `ChannelAddByRSSDirectoryMatchService.getForListedFeeds`:
   `channel_about` present, `feed_policy.public_visible`, lifecycle Active or PendingArchive.
   Blocked v4 feeds fail `public_visible`, so the match never returns them.
4. **Episode mapping.** By guid first, then by `formatGuidEnclosureUrl(enclosure_url)`, within the
   matched channel, Active items only. Device-local guids (`isDeviceLocalAddByRSSGuid`) are ignored.
   An episode with no match keeps its Add by RSS row and snapshot; it still plays.
5. **Membership.** Converting needs no membership: it replaces a follow rather than adding one.
   Adding still follows today's rules; a match skips the Add by RSS feed cap because the result
   is not an Add by RSS feed.
6. **Duplicates.** When a queue or playlist already holds the directory episode, the Add by RSS row
   is deleted and the existing row is kept.
7. **No sweep job.** Nothing scans accounts in the background. A follow heals at the next add or
   refresh on any client, or at the v4 library copy (set `v4-signed-out-carryover`).
8. **Refresh pacing on mobile.** The match runs at most once an hour per app session, and always on
   pull-to-refresh. A failed match request is logged and the refresh carries on with the Add by RSS
   parse; it never parks the sync run.
9. **Other people's playlists.** Only playlists the account owns are rewritten. Someone else's
   playlist keeps its Add by RSS row.
10. **Removed Content.** A conversion writes no Removed Content row: nothing was lost.
