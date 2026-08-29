# 454-share-url-parity

**Master step:** 15.5
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Generate the **same shareable URLs as web** across mobile detail screens so links are
  cross-platform (and openable by the 450–452 universal/App Links).
- Extend the existing now-playing share helper to a shared URL builder covering podcast, episode,
  clip, **playlist**, and **profile** by `id_text`, sourced from a canonical web base URL in config
  (not hardcoded per call site).
- Add share affordances on podcast / episode / playlist / profile detail screens (functional
  sketch; no Track 23 polish). Full-player share already exists.

## Acceptance criteria

- Mobile share URLs match web `ModalShare` shapes: `${WEB.origin}/{podcast|episode|clip|playlist|profile}/{id_text}`.
- Canonical base URL comes from mobile config (env-driven), consistent with 450/451 domains.
- Share buttons on the target detail screens invoke `Share.share` with the correct URL; skipped in
  E2E where share sheet is not automatable.

## Web parity references

- `apps/web/src/components/Modal/ModalShare.tsx` (URL shapes).
- `apps/mobile/src/lib/playback/shareNowPlaying.ts` (`buildNowPlayingShareUrl`, base URL const).
- `apps/mobile/src/screens/player/FullPlayerScreen.tsx` (`Share.share` pattern, `full-player-share`).
- Detail: 358-share-now-playing-link (11.13, done).

## Out of scope

- Track 23 visual polish of share buttons.
- Deep OG/preview metadata (web SEO owns canonical tags).

## Verification

```bash
grep -rq "id_text" apps/mobile/src/lib/playback/shareNowPlaying.ts
grep -rq "Share.share" apps/mobile/src/screens
```
