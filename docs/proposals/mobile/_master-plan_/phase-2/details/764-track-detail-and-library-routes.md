# 764-track-detail-and-library-routes

**Master step:** P2.1.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Replace the `TrackDetail` placeholder in
[`navigation/index.tsx`](apps/mobile/src/navigation/index.tsx) with a real screen matching web
track detail minus boosts, and register album / artist / track on the Library stack.

Depends on: [761](761-channel-detail-shell-and-prefs.md), [762](762-album-detail-parity.md) (album
header band).

### Layout (web contract)

Web paints [`CoreAlbumHeader`](apps/web/src/components/Core/Artist/Album/) then
[`CoreTrackHeader`](apps/web/src/components/Core/Artist/Album/Track/) then tabs. Mobile:

1. Album `ChannelHeader` (channel + navigate to album on title press)
2. Track play chrome (artwork, title, pub date + duration — same fields as web
   `CoreTrackHeaderPlaySection`; no season / track number)
3. Section chips + panes

### Tabs

| Tab          | Label key                | Condition                       |
| ------------ | ------------------------ | ------------------------------- |
| `summary`    | `info.summary.summary`   | Always                          |
| `transcript` | `info.transcript.lyrics` | Evidence — item has transcripts |

No boosts. No chapters / clips / soundbites (web track page omits them). Persist tab via
`TRACK_TABS` prefs from 761. Prefer shared keys so web and mobile stay aligned.

Transcript loading: reuse the episode transcript load pattern
(`useEpisodeSectionPanes` / `loadEpisodeTranscriptPane` or a shared hook extracted if duplication
is real — [`reuse-beyond-components`](/.cursor/rules/reuse-beyond-components.mdc)).

### Play / queue

Wire play and queue through existing `useHomeRowPlayback` / queue mutations with music medium
(`MediumEnum.Music`), same as album track rows.

### Library stack

[`LibraryStackParamList`](apps/mobile/src/navigation/index.tsx) today has podcast / episode / clip
only. Add `AlbumDetail`, `ArtistDetail`, `TrackDetail` (and settings if album/artist settings are
pushed screens) so queue / downloads / playlist rows can deep-navigate without jumping tabs
([`mobile-tab-stack-isolation`](/.cursor/rules/mobile-tab-stack-isolation.mdc)).

Update linking config for `my-library/` scoped album / artist / track paths if missing.

### Placeholder removal

Delete the inline `TrackDetailScreen` placeholder function; register the real screen on Home,
Search, Browse, and Library stacks.

## Acceptance criteria

- Real TrackDetail with album band, play chrome, summary + lyrics tabs.
- Library stack can open album / artist / track.
- Placeholder title gone; Maestro covers track open from Home tracks chip and from album.
- Boosts / chapters / clips absent on track.

## Web parity references

- [`apps/web/src/app/track/[item_id]/`](apps/web/src/app/track/[item_id]/)
- [`QUERY_PARAMS_ITEM_MUSIC_TYPE_VALUES`](packages/helpers-requests/src/api/queryParams.ts)

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- track
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
