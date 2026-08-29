# 280-rss-play-add-by-rss

**Master step:** 9.21
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Play an add-by-rss resource using the `PlaybackTarget.kind` add-by-rss policy from
  `@podverse/playback-core`.
- Resolve the enclosure + playback decision via shared policy (do not reimplement policy in the app);
  transport via the native bridge `loadAndStart`.
- Add-by-rss items are client-side resources — ensure the target carries the right metadata for the
  policy and for later queue/native-cache writes (Tracks 10/12).

## Acceptance criteria

- Playing an add-by-rss item routes through `@podverse/playback-core` policy (no ad-hoc branching)
- Correct `PlaybackTarget.kind` used; enclosure resolves and plays via the native bridge
- Behavior matches web add-by-rss playback decisions

## Web parity references

- `@podverse/playback-core` `resolvePlaybackLoadDecision` + `PlaybackTarget` (add-by-rss kind)
- Web add-by-rss playback path: [`apps/web/src/components/AddByRSS`](/apps/web/src/components/AddByRSS)
- Skills: **mobile-playback**; [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md)

## Architecture notes

- Depends on the media engine audio path (Track 2 spike, `done`). Video add-by-rss follows Track 2
  full / Track 11.
- Keep the play call behind the same hook contract as Track 8.13/Track 10 so queue integration can
  replace the stub without touching RSS UI.

## Verification

```bash
npm run mobile:e2e:test -- add-by-rss
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
