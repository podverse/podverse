# 265-artist-detail-screen

**Master step:** 9.6
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Artist detail screen for music artists, mirroring web `/artist/[channel_id]`.
- Header (artist image, name) + albums/tracks sections via music channel request wrappers.
- Album cards reuse 8.8; track rows reuse 8.9; navigation into album/episode detail.

## Acceptance criteria

- Artist header + sections load from same endpoint semantics as web artist page
- Layout mirrors web artist page, adapted to RN, tokenized
- Loading/empty/error via 8.11

## Web parity references

- [`apps/web/src/app/artist/[channel_id]`](/apps/web/src/app/artist),
  [`apps/web/src/components/List/Music`](/apps/web/src/components/List/Music)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
