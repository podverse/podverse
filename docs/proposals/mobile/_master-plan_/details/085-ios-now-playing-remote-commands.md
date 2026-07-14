# 085-ios-now-playing-remote-commands

**Master step:** 2.6
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Update `MPNowPlayingInfoCenter` with title/artist/duration/elapsed (spike may use placeholders).
- Register `MPRemoteCommandCenter` play/pause/seek (and skip if trivial).
- Commands drive the same single AVPlayer.

## Architecture notes (car foundation)

- Lock screen / Control Center must not spawn a second player.
- **One** shared `MPRemoteCommandCenter` registration owned by the engine. CarPlay now-playing and
  remotes (12.9–12.10) bind to the **same** AVPlayer and this same command center — do not add a
  second registration path in Track 12.
- Phone lock-screen is the spike surface; CarPlay templates are Track 12, but the remotes/player
  contract is fixed here.

## Acceptance criteria

- Step 2.6 complete per master plan
- Lock screen shows now-playing and play/pause works
- Commands route to podverse-media-engine’s single AVPlayer
- Module README notes CarPlay will share this command center + player (12.9–12.10)

## Web parity references

- [mobile-playback](/.cursor/skills/mobile-playback/SKILL.md)
- [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc)

## Verification

```bash
# Manual: play, lock device, use lock-screen controls
```
