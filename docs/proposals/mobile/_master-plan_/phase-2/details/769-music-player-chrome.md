# 769-music-player-chrome

**Master step:** P2.1.4
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Close the music player chrome gap: when the active queue / target is music, offer track previous /
next (and repeat / shuffle where web does) instead of podcast-style jump controls alone.

Depends on: music playback targets already exist (`item-music` in
[`buildPlaybackTarget.ts`](apps/mobile/src/lib/playback/buildPlaybackTarget.ts)); no hard dependency
on 765–768 beyond shared player files — sequence after enclosures to avoid merge conflicts on
`FullPlayerScreen` / transport.

### Web behavior

[`MediaPlayerButtonsMobile.tsx`](apps/web/src/components/MediaPlayer/): AV queues get ±15 jump;
music queues get track previous / next. Desktop / modal also expose repeat and shuffle for music.

### Mobile today

[`fullPlayerRows.ts`](apps/mobile/src/components/player/fullPlayerRows.ts) recognizes `item-music`
for row identity but transport stays podcast-oriented
([`FullPlayerTransportRow`](apps/mobile/src/components/player/) / jump buttons).

### Target

1. When now-playing kind is `item-music` (or active queue medium is Music), show previous / next
   track controls that call existing skip / queue advance APIs.
2. Repeat and shuffle: match what web exposes for music if the session / queue already has the
   hooks; if mobile has no repeat/shuffle policy yet, implement the minimum that playback-core or
   queue already supports and **ask** only if a new native mode is required — prefer wiring existing
   prefs over inventing UX.
3. Podcast / video / clip targets keep current jump-15 (or current jump set) behavior.
4. Mini player: at least previous/next or clear deferral if chrome is too small — record the choice
   in the plan set summary; default to full player first, mini follow-up only if web mini also
   differs.

### Out of scope

- V4V boost row on music (Phase 3)
- Clip authoring on tracks (clips are podcast-oriented)

## Acceptance criteria

- Playing a track shows music-appropriate transport on the full player.
- Skip previous/next moves within the music queue correctly.
- Podcast transport unchanged.
- E2E covers play track → next (seeded music fixture).

## Web parity references

- [`MediaPlayerButtonsMobile.tsx`](apps/web/src/components/MediaPlayer/)
- [`MediaPlayerButtonsDesktop.tsx`](apps/web/src/components/MediaPlayer/)
- [`resolvePlaybackLoadDecision.ts`](packages/playback-core/src/resolvePlaybackLoadDecision.ts)
  music intents

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- player-screen
npm run mobile:e2e:test -- track
open .artifacts/mobile-e2e-reports/latest/failures.json
```
