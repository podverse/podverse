# 264-album-detail-screen

**Master step:** 9.5
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Album detail screen for music channels, mirroring web `/album/[channel_id]`.
- Header (cover art, album title, artist) + track list via music channel/item request wrappers.
- Track rows reuse the track row (8.9); tap plays/queues via stub (Track 10/11 later).

## Acceptance criteria

- Album header + track list load from same endpoint semantics as web album page
- Layout mirrors web album page, adapted to RN, tokenized
- Loading/empty/error via 8.11

## Web parity references

- [`apps/web/src/app/album/[channel_id]`](/apps/web/src/app/album),
  [`apps/web/src/components/List/Music`](/apps/web/src/components/List/Music)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
