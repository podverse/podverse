# 358-share-now-playing-link

**Master step:** 11.13
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Share now-playing deep link action (integrates Track 15 when links land; stub share sheet OK).

## File paths

- Full player actions row

## Acceptance criteria

- Share action presents OS share sheet with podcast/episode URL when available
- No crash when item lacks public URL
- Aligns with future Track 15 path map

## Web parity references

- Web share URL helpers
- Track 15 deep link docs

## Verification

```bash
npm run mobile:e2e:test -- play-mini-player
```

## Depends on

- 11.5

## Implementation notes

- `apps/mobile/src/lib/playback/shareNowPlaying.ts` — `buildNowPlayingShareUrl(target)` maps the
  now-playing target to a public Podverse web URL (`/episode`, `/clip`, `/podcast`), returning `null`
  for add-by-RSS. The base is a Track 15 placeholder constant (`https://podverse.fm`) until the deep
  link/path map lands.
- Full player `full-player-share` button opens the OS share sheet via RN `Share.share`; it is
  disabled when no public URL exists and catches dismissal so it never crashes.
