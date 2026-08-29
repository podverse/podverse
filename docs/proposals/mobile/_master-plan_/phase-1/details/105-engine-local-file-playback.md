# 105-engine-local-file-playback

**Master step:** 2.26
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Support `file://` (and platform-equivalent local paths) through the same engine `load` /
  `loadAndStart` path used for http(s).
- Required for Track 13 offline downloads; do not invent a second player for local files.

## Architecture notes

- iOS: `AVURLAsset` / `URL(fileURLWithPath:)` — confirm sandbox / bookmark needs for downloads dir.
- Android: `MediaItem.fromUri` with `file://` or content URIs; document which forms are supported.
- Types already anticipate local paths — make behavior explicit + tested manually.

## Edge cases

- Missing file → mapped error (2.27), not hang.
- Content URI vs file path on Android downloads.
- Mixed queue: remote then local without engine restart beyond item replace.

## Acceptance criteria

- Local file URL plays on iOS and Android via the shared engine.
- Same events (`progress`, `ended`, `error`) as remote.
- Documented in module README.

## Web parity references

- Track 13 downloads (`file://` play)
- [DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md)

## Verification

```bash
# Manual: place a sample media file in app sandbox; load via debug panel
npm run mobile:ios -- --device "iPhone 17 Pro"
```

## Depends on

- 2.4 / 2.7 audio load path (`done`)
