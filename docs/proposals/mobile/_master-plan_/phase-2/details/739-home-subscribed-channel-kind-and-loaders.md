# 739-home-subscribed-channel-kind-and-loaders

**Master step:** P2.1.1 follow-up
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Home chips for **Artists, Albums, Tracks, and Clips** must list only subscribed content — never the
global directory. Persist a channel **kind** on local follows so Podcasts / Artists / Albums can
split the same subscription store.

### Kind column

- SQLite `subscribed_channel.kind`: `podcasts` | `artists` | `albums`
- Derived from `DTOChannel.medium_id` via `isArtistMediumId` / `isAlbumMediumId` (else podcasts)
- Add-by-RSS: `resourceType` artists → `artists`; albums/tracks → `albums`; else `podcasts`
- Existing rows migrate as `podcasts`; the next subscribe / directory sync stamps the real kind
- Directory hydration uses `medium: 'all'` so music follows reach the device

### Home loaders

| Chip     | Source                                                                 |
| -------- | ---------------------------------------------------------------------- |
| Podcasts | `subscriptionsRepository.list` filtered to `kind: podcasts`            |
| Artists  | local follows with `kind: artists`                                     |
| Albums   | local follows with `kind: albums`                                      |
| Tracks   | local `channel_item` rows whose channel is artists/albums; signed-in empty store may use account `reqItemGetMany` with `medium: music`, `type: subscribed` |
| Clips    | `reqClipGetManyPublic({ type: 'subscribed' })` only when authenticated; otherwise `[]` |
| Episodes | unchanged (local subscribed items; account fill never global)          |

**Never** `type: 'global'` on Home for any chip.

## Acceptance criteria

- No Home chip returns global/directory rows for any auth state.
- Artists and Albums lists contain only follows of that kind.
- Podcasts no longer mixes artist/album follows into the podcast list.
- Clips signed out returns an empty row set from the loader (UI decides login vs Browse).
- Unit tests cover kind mapping from medium_id / resourceType.

## Web parity references

- Mobile-only. Web Home has no Artists/Albums/Tracks/Clips chips.
- [705-home-subscribed-list-and-filter](705-home-subscribed-list-and-filter.md)
- [720-defer-home-media-type-sort-coverage](720-defer-home-media-type-sort-coverage.md)

## Verification

```bash
# Mobile
npm --prefix apps/mobile run test -- src/data/repositories/subscriptionsMerge.test.ts
npm run mobile:e2e:test -- home
```
