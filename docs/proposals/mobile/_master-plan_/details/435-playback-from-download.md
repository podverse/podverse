# 435-playback-from-download

**Master step:** 13.6
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- When playing a downloaded item, resolve enclosure to local `file://` (or platform equivalent)
  via the downloads repository and pass that URL into the existing
  `podverse-media-engine` load path (Track **2.26** / detail 105).
- Same player instance — no second Video/Audio component.
- Prefer local file when status is `complete` and file exists; else fall back to remote URL.

## Architecture notes

- Resolution helper in data layer or playback adapter: `resolvePlaybackUrl(item) → string`
- Missing/corrupt file → mapped engine error + UI; offer re-download
- Queue / now-playing should carry enough id to look up download row
- Android: confirm `file://` vs content URI forms match engine README
- Local play is for **progressive files only** (rows that passed eligibility). Livestream /
  HLS items never have download rows; keep existing
  `PlaybackProvider` live_item block for remote live play.

## Edge cases

- File deleted from disk but SQLite row remains → treat as failed; clean row or re-download
- Mixed queue: remote then local without engine restart beyond item replace
- Video downloads use same surface targets as streaming video
- Never fall back to remote m3u8 when a download row is missing for a live item — leave live
  path blocked until a future HLS track

## Acceptance criteria

- Completed download plays offline (airplane mode) on iOS and Android
- Progress/ended/error events match remote playback
- Documented briefly in downloads or engine README

## Web parity references

- [105-engine-local-file-playback](/docs/proposals/mobile/_master-plan_/details/105-engine-local-file-playback.md)
- Mobile-only features §1–1.2

## Verification

```bash
# Manual + Maestro (13.10): play downloaded item with network disabled
npm run mobile:ios -- --device "iPhone 17 Pro"
```

## Depends on

- 2.26 / 105 — done
- 13.3–13.5 schema + list — this phase
