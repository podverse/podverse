# Sub-Plan 07c: podcast:liveItem (channel)

**Parent:** [07-complex-tags-implementation.md](07-complex-tags-implementation.md). Execute after 01–03; can run in parallel with 07a, 07b (07d last).

## Objective

Emit channel-level `<podcast:liveItem>` elements so Partytime parses and `compatLiveItemsDtos` runs without error. Exactly 1 live item per feed where the feed includes live items; vary status (pending, live, ended) across feeds.

## Authority

- **Partytime:** `phase-4.ts` — `liveItem`, `Phase4PodcastLiveItem`. Required: `status`, `start`, and per-item `guid`, `title`, `enclosure`. Optional: `end`, `image`, `contentLinks`.
- **Parser-mapping:** `packages/parser-mapping/src/compat/partytime/liveItem.ts` — `compatLiveItemsDtos`.

## Reference enclosure for all live items

**Every** `<podcast:liveItem>` should use this enclosure so tests hit a real 24/7 stream:

```xml
<enclosure length="33" type="audio/mpeg" url="https://op3.dev/e/listen.noagendastream.com/noagenda"/>
```

Use this URL, type, and length for every live item’s enclosure (no need to point at localhost assets for the stream itself).

## Implementation

- **Which feeds:** Add exactly one `<podcast:liveItem>` to a subset of feeds (not necessarily every feed); choose by feed kind or randomly so some feeds have live items.
- **Status variety:** Live items must **vary in status** across feeds: use **live**, **pending**, or **ended** so tests cover all three states (e.g. assign different statuses to different feeds that have a live item).
- **Required:** `status`, `start` (date/time), `guid`, `title`, `enclosure`. Use the reference enclosure above for every live item; use faker for guid, title, and start (and optional end).
- **Optional:** `end`, `image`, `contentLinks`. Omit or add for variety (e.g. set `end` when status is ended).

## Implementation steps

1. Add a helper that builds one `<podcast:liveItem>` (with inner item structure: guid, title, enclosure, status, start, optional end/image/contentLinks). Use the **reference enclosure** (url=https://op3.dev/e/listen.noagendastream.com/noagenda, type=audio/mpeg, length=33) for every live item; use faker for guid, title, start, and optionally end.
2. For feeds chosen to have a live item, append the liveItem block inside the channel (after other channel podcast tags).
3. Vary `status` across feeds: assign **live**, **pending**, or **ended** so different feeds exercise different states.
4. Remove or update placeholder comment for podcast:liveItem from Sub-Plan 04.
5. Run generate; parse with Partytime; call `compatLiveItemsDtos`; confirm no throw and expected DTO shape.

## Acceptance criteria

- Feeds that include live items have exactly one `<podcast:liveItem>` with required fields.
- Every live item uses the reference enclosure (url=https://op3.dev/e/listen.noagendastream.com/noagenda, type=audio/mpeg, length=33).
- Status varies across feeds: at least one feed with status **live**, one with **pending**, one with **ended**.
- Partytime parses without error; compatLiveItemsDtos runs without throw.

## Run after this plan

From repo root: `npm run generate -w podverse-test-assets -- 2 --items 20 --multi 2`. Parse a generated feed that includes a live item; run compatLiveItemsDtos. Fix any parse or compat errors.
