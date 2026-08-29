# 010-skill-mobile-playback

**Master step:** 0.10
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

Add `.cursor/skills/mobile-playback/SKILL.md` mapping web playback policy to NativePlaybackBridge.

## Acceptance criteria

- Skill covers playback-core consumption, bridge contract, no track-player
- References media-player-architecture and queue parity doc
- Seamless video = surface reparenting, not remount

## Web parity references

- [.cursor/skills/media-player-architecture/SKILL.md](.cursor/skills/media-player-architecture/SKILL.md)
- [docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md)

## Verification

```bash
test -f .cursor/skills/mobile-playback/SKILL.md
```
