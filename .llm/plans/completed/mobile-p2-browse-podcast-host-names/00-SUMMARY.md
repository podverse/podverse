# Phase 2 — Browse podcast host names

Area: **P2.1.1 Home & browse** follow-up (Browse Podcasts row density).

Detail doc: [738-browse-podcast-host-names](/docs/proposals/mobile/_master-plan_/phase-2/details/738-browse-podcast-host-names.md).

Source: nextgen Search vs Browse screenshots (not a legacy port). Search already shows host names;
Browse Podcasts should match. Subscribed Home rows stay without them.

## Locked decisions

1. **Browse Podcasts only** — host name above title and date. Videos / Artists / Albums stay
   title + date.
2. **Subscribed lists stay host-less** — Home podcast rows and unsubscribed-download footer keep
   `subtitle: null`. Do not add `author` to `SubscribedChannel`.
3. **Web unchanged** — directory `/podcasts` rows stay title + last-pub date. Deliberate
   mobile-only divergence.
4. **Missing author** — omit the line (same as Search). No `link` as a host stand-in.
5. **Opt-in mapper flag** — `normalizeChannelRows(items, { includeAuthor?: boolean })` so other
   channel lists do not pick up author by accident.
6. **No API / DTO / i18n** — `channel_about.author` already exists; author text is feed data.

## Out of scope

- Web `/podcasts` / `/videos` directory rows
- Browse Videos, Artists, Albums
- Home subscribed metadata (unseen, downloads, live)
- Persisting author on the local subscription record
