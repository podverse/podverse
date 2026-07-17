# 266-clip-detail-screen

**Master step:** 9.7
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Clip detail screen via clip request wrappers on `ApiRequestService`.
- Header (clip title, source episode/channel, start + duration) + description.
- Play-at-clip-bounds action: sets up a bounded-segment play (full bounded playback in Track 10.17);
  stub/hook until then.

## Acceptance criteria

- Clip metadata loads from same endpoint semantics as web clip page
- Layout mirrors web clip page, adapted to RN, tokenized
- Play action passes clip start/end to the playback hook contract

## Web parity references

- [`apps/web/src/app/clip/[clip_id]`](/apps/web/src/app/clip),
  [`apps/web/src/components/Clip`](/apps/web/src/components/Clip)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
