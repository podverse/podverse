# 781-artist-list-row-dates

**Master step:** P2.5.6
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Web artist list rows do not show a date. Directory
[`ListArtistRow`](/apps/web/src/components/List/Music/Artists/ListArtistRow.tsx) and
[`ListArtistGridNode`](/apps/web/src/components/List/Music/Artists/ListArtistGridNode.tsx) gate a
subtitle on `last_pub_date` existing, then render **author** (or `untitled`) in a `lastPubDate`
slot. Subscribed / Home artist nodes pass `author` as `subtitle`.

Podcasts already show `formatDateAbbrev(lastPubDate)`. Artist rows should do the same.

Mobile Browse / Home artist rows already draw `row.updatedAt` via `HomeFeedRow`. No mobile row
chrome change once [780](780-artist-feed-last-pub-date.md) fills the field.

## Locked decisions

- Show the formatted `last_pub_date` on web directory and subscribed artist list and grid.
- Do not add an author line on artist rows.
- Omit the date line when `last_pub_date` is null. Do not show `untitled`.
- Add-by-RSS artist nodes stay on author.
- Album rows stay on author.
- Mobile grid tiles stay artwork-only (title remains the accessible name).

## Acceptance criteria

- `/artists` list and grid show `formatDateAbbrev` of `channel_about.last_pub_date` when present.
- Web Home / subscribed artist lists show the same date, not author.
- Missing date omits the secondary line.
- Mobile artist list rows keep using `home-feed-row-updated-*` when `updatedAt` is set.
- Web E2E asserts the formatted date on a seeded publisher-music channel (seed in plan 05).

## Web parity references

- Podcast date rows: [`CommonPodcastRow`](/apps/web/src/components/Common/Podcast/CommonPodcastRow.tsx)
- Artist directory: [`ListArtistRow`](/apps/web/src/components/List/Music/Artists/ListArtistRow.tsx)
- Artist subscribed: [`CoreArtistRow`](/apps/web/src/components/Core/Artist/CoreArtistRow.tsx)
- Mobile date line: [`HomeFeedRow`](/apps/mobile/src/screens/home/HomeFeedRow.tsx)
  (`useUpdatedLabel` + `readChannelUpdatedAt`)

## Verification

```bash
make e2e_test_web_report_spec SPEC=e2e/artists-list-date-and-view.spec.ts
open .artifacts/e2e-reports/latest/index.html
```
