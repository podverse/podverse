# v4 signed-out carryover — summary

Request: [00-REQUEST.md](00-REQUEST.md). Phases: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md),
[COPY-PASTA.md](COPY-PASTA.md). Product rules:
[08 § Signed-out carryover rules](/docs/proposals/v4-to-v5-migration/08-mobile-first-launch-migration.md#signed-out-carryover-rules)
and [05 § Legacy podcast lookup](/docs/proposals/v4-to-v5-migration/05-id-mapping-and-catalog-seeding.md#legacy-podcast-lookup).

A signed-out v4 phone keeps every subscription it can. Shows v5 has parsed become directory
subscriptions; shows it has not become signed-out Add by RSS feeds, which the directory match
(previous set) moves later on its own. Spam and takedown shows are dropped and counted. The
signed-in v4 library copy applies the same directory match to Add by RSS URLs. Before the phone
copy runs, the person can save an OPML file.

## Requirement ledger

- **R1** "their device will migrate to using those" (matched shows become subscriptions) — Plan:
  01, 02, 05
- **R2** "for the outliers ... convert to being ads by RSS feeds for that non-logged-in user" —
  Plan: 02, 05
- **R3** Answer: feed URL from the cached object first, then the lookup — Plan: 01, 02, 04, 05
- **R4** Answer: spam and takedown dropped and counted; non-public become Add by RSS — Plan: 01,
  02, 05
- **R5** "encourage them to back up an OPML file before proceeding with the migration" — Plan: 06
  (screen); store text was written in doc 10 while planning
- **R6** Signed-in copy: matched Add by RSS URLs become directory follows — Plan: 03

## Settled decisions

1. **Map rows.** One `podcast` row per v4 podcast that is not `spam`/`takedown` and has an
   authority URL: status `unresolved` (or kept `mapped` when the library copy already wrote it),
   `resolve_key` = Podcast Index id when the podcast is public and has one, `v4_feed_url` =
   authority URL. `spam`/`takedown`: status `dropped`, no `resolve_key`, no `v4_feed_url`. No
   authority URL and not flagged: no row.
2. **Lookup answers,** in this order per id: `blocked` (row `dropped`); `channel` (mapped
   `v5_id_text`, else the Podcast Index id, else a directory match on `v4_feed_url`, each through
   the merge survivor and the directory-match eligibility filters); `feed_url` (row has
   `v4_feed_url`); `not_here` (no row).
3. **Lookup limits.** At most 2,000 ids. Public, rate limited per IP and per install id
   (`X-Podverse-Install-Id` header, a random value the phone keeps).
4. **Phone gate.** Prompts 04–06 stop unless doc 08 § Open questions records a passing spike for
   at least one platform. They report `RUNNER-STATUS: BLOCKED` otherwise. That stop is expected;
   resume once the spike is written down.
5. **Order on the phone.** Read once after first paint into a staging table; resolve in a queued
   sync job only after the person taps Continue Migration (when the screen applies) or right away
   (when it does not). Signed in at the time: wait, and resolve after the next sign-out only if the
   rows are still pending; the account copy covers signed-in people.
6. **No bearer token.** The phone never reads the v4 Keychain or token.
7. **Library copy.** Add by RSS URLs that match a directory channel become
   `account_following_channel` rows. The Add by RSS tier counts only the URLs left.
