# 324-playback-target-kinds

**Master step:** 10.15
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Handle all `PlaybackTarget.kind` variants per parity checklist for **audio-first** behavior.
- Video/livestream may load audio or no-op with clear UX until PG-5 surfaces exist.

## Architecture notes

Kinds defined in `packages/playback-core/src/playbackTarget.ts`. Map each to enclosure/url
resolution used by web.

## Edge cases / cross-track deps

- item-video without surface: still allow audio-only if enclosure has audio, else notice
- livestream live edge vs VOD

## Acceptance criteria

- Kinds: clip, soundbite, chapter, item-podcast, item-video, item-music, add-by-rss, livestream
  each have an explicit audio-first code path
- Unknown kind fails safely
- Checklist documented in module or detail follow-up

## Web parity references

- `packages/playback-core/src/playbackTarget.ts`
- Parity doc: DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md

## Verification

```bash
npm run test -w @podverse/playback-core
```

## Depends on

- 10.14
