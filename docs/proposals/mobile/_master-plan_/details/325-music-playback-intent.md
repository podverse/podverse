# 325-music-playback-intent

**Master step:** 10.16
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Implement music `intent` discriminator for stats side effects
  (`session_restore` | `explicit_play` | `fresh_transition`).

## Architecture notes

Align with playback-core music intent types and web MediaPlayer music paths.

## Edge cases / cross-track deps

- Restoring session must not double-count plays

## Acceptance criteria

- Intents match `MusicItemPlaybackIntent` in playback-core
- Stats (10.21) only fire on intents web fires for
- Queue advance uses `fresh_transition`

## Web parity references

- `packages/playback-core/src/playbackTarget.ts` music intent
- Web music track play sections

## Verification

```bash
npm run test -w @podverse/playback-core
```

## Depends on

- 10.13–10.14
