# 06 — Feature docs, guidance, and close the set

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

## Rows

R9

## Runs after

01–05.

## Files

- `docs/features/ADD-BY-RSS.md`
- `.cursor/rules/add-by-rss-data-contracts.mdc`
- `release-notes/scratchpad.md` (only if an earlier prompt reported an entry in its final message
  instead of writing it)
- `.llm/plans/active/add-by-rss-directory-match/**` → `.llm/plans/completed/add-by-rss-directory-match/`

## 1. Feature doc

Add a section `## Directory match` to `docs/features/ADD-BY-RSS.md`. Describe the finished
behavior, not the plan:

- When it runs: on add, and on refresh at most hourly (always on an explicit refresh).
- Who runs it: signed-out mobile on the phone; signed-in mobile and the website through
  `POST /account/follow/add-by-rss-channel` and `POST /account/add-by-rss/convert-to-channel`.
  The lookup is `POST /channel/add-by-rss-match`.
- The match rule and guid guard, from `00-SUMMARY.md` settled decisions 1–3, in plain sentences.
- What moves: server queue (upcoming, history, now playing) and owned playlists; on the phone
  downloads, playback positions, seen and live state, and auto-download settings. Episodes with no
  directory match keep their Add by RSS data and still play.
- What does not: password-protected feeds; other people's playlists.
- No membership is needed to convert, and a matched add does not count toward the Add by RSS
  limit.
- The person sees nothing; the phone logs "Moved to Podverse Directory".

Fix any sentence elsewhere in that doc that says an Add by RSS feed stays Add by RSS after the
directory parses it.

## 2. Guidance

In `.cursor/rules/add-by-rss-data-contracts.mdc`, add one bullet: a feed that matches a directory
channel leaves Add by RSS through `addByRssPromotion` (mobile) and
`AccountAddByRSSDirectoryConversionService` (server); a new table that stores an Add by RSS feed
URL, hash, or download id must be added to `addByRssPromotionRemap.ts` and to the server
conversion.

## 3. Close

Check the scratchpad has one entry each from 01–05; append any missing one from that prompt's
plan `## Release scratchpad`. Then follow **plan-completion**: move the set to
`.llm/plans/completed/add-by-rss-directory-match/`.

End with the cumulative verification from `00-EXECUTION-ORDER.md` § Cumulative verification,
exactly as written there, with its tab labels.

## Tests

None.

## Release scratchpad

None for this prompt.
