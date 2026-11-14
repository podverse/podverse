# v4 pilot findings — summary

Request: [00-REQUEST.md](00-REQUEST.md). Evidence: [00-FINDINGS.md](00-FINDINGS.md).
Prompts and models: [COPY-PASTA.md](COPY-PASTA.md). Order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## Requirement ledger

- **R1** (F1) "make sure that our migrations are in reality able to handle a full migration": v4 and v5 timestamps must not depend on the host timezone — Plan: 01
- **R2** (F2) "this won't surface as issues for our users": v4 "Only with link" playlists and clips stay reachable by link — Plan: 02
- **R3** (F6) "grandfather the outliers in": a non-URL Add by RSS value must not refuse the account's other feeds — Plan: 03
- **R4** (F4) "able to handle a full migration": a playlist follow survives when the owner is copied later — Plan: 04
- **R5** (F3) "able to handle a full migration": history and queue rows that point at a clip keep the clip once it exists — Plan: 05
- **R6** (F5) "grandfather the outliers in": history past 10,000 rows is kept — Plan: 06
- **R7** (F7) "a graceful way of handling those issues": a failed feed parse records a classified reason; no HTML bodies in logs — Plan: 07
- **R8** (F10) the catalog wait finishes in bounded time; permanent failures settle early — Plan: 08
- **R9** (F8) "grandfather the outliers in": large v4-subscribed feeds over the body cap still parse — Plan: 09
- **R10** (F9) an oversized item duration does not fail the whole feed — Plan: 10
- **R11** (F10) the rehearsal prompt runs the scheduled job loop; findings land in doc 16 — Plan: 11
- **R12** (F2) v4 public profiles stay public — Plan: 12 (Q2 answered: copy the flag)
- **R13** (F11) email-case twins: the left-out row's library merges into the kept account — Plan: 13 (Q1 answered: merge)
- **R14** "investigate why they are extreme outliers... anything suspicious" — answered in 00-FINDINGS.md F5, F8, F12

## Settled decisions

These are decided. Plans transcribe them.

1. **Visibility.** v4 `isPublic = false` on a playlist or a user clip becomes v5 `unlisted`.
   `isPublic = true` stays `public`. v5 `private` is not written by the copy or replay. (Plan 02)
2. **Add by RSS values.** A value with no http(s) canonical form (`canonicalAddByRSSFeedUrl`
   returns null) is not a feed. It is not written, not counted toward the Add by RSS cap, and is
   reported as a count `addByRssNotFeedUrl`. Values the canonicalizer repairs (uppercase scheme,
   surrounding space, `https:/host`) are kept. (Plan 03)
3. **Playlist follows.** A new pending row kind `follow_playlist`, status `unresolved`, reason
   `waiting_playlist`. Replay writes the follow once the playlist exists. Never dropped. (Plan 04)
4. **Clip pointers in playback.**
   - Another user's clip that is already in v5 (`clip.id_text` = the mediaRef id) is written as
     that clip.
   - Another user's clip that is not in v5 yet: write the parent episode now, plus a pending row
     (zone kind, `unresolved`, reason `clip_not_copied`). Replay swaps the episode row for the
     clip row once the clip exists.
   - An official chapter or soundbite: write the parent episode, plus a pending row (zone kind,
     `resolved`, reason `official_as_item`). Replay ignores it; verify counts it. (Plan 05)
5. **History grandfathering.** `account_membership_status.max_queue_resources`: null is the
   default of 10,000; listed tiers are 20000, 30000, 40000, 50000, 60000, 100000.
   `enforce_queue_resource_limit` reads the account's tier. The copy writes the smallest tier
   that covers the account's largest per-medium queue. Above 100,000 is `needs_operator`. (Plan 06)
6. **Parse failure reasons.** One closed set: `http_404`, `http_410`, `http_403`, `http_4xx`,
   `http_5xx`, `body_too_large`, `dns_not_found`, `tls_error`, `timeout`, `connection_error`,
   `not_a_feed`, `no_feed_url`, `db_value_out_of_range`, `db_error`, `parse_error`, `unknown`. (Plan 07)
7. **Settle.** Permanent reasons are `http_404`, `http_410`, `dns_not_found`, `not_a_feed`,
   `no_feed_url`. A v4 migration retry with a permanent reason fails after its second attempt.
   Other reasons keep a shorter ladder: first retry 15 minutes after seeding, then 1 hour, 6 hours, 1 day, 1 day, 1 day. The catalog
   wait also ends after `--catalog-wait-hours` (default 24) and leaves the rest to the library
   copy's `waiting_parse` pending rows and replay. (Plan 08)
8. **Large feeds.** A v4 migration feed that fails with `body_too_large` gets
   `max_response_body_bytes_override = 50000000` (the parser's maximum) and one immediate retry.
   A second `body_too_large` is permanent and listed for an operator. (Plan 09)
9. **Durations.** A feed number written to `media_player_time` that is not finite, negative, or at
   least 100,000,000 becomes null where the column allows null. A soundbite whose duration
   becomes null is skipped. (Plan 10)
10. **Timezone.** v4 timestamps are read as UTC by formatting them in SQL. The `v4_*` and
    membership-import npm scripts set `TZ=UTC`, and the rehearsal refuses to start when the
    process offset is not zero. (Plan 01)
11. **Public profiles.** v4 `users.isPublic = true` → v5 account `public`; anything else →
    `private`. (Plan 12)
12. **Email-case twins.** The left-out v4 row gets a `legacy_id_map` user row (`resolve_key =
    'email_case_twin'`) pointing at the kept account. Its library is merged into that account
    after the kept row's copy, with caps from the combined counts. Its membership, password, and
    email are not used. (Plan 13)

## Answered questions

- **Q1 — Email-case twins.** Answered: merge the left-out row's library into the kept account.
  Settled decision 12, plan 13.
- **Q2 — Public profiles.** Answered: copy the flag. Settled decision 11, plan 12.

## Order

Phases and models are in [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).
