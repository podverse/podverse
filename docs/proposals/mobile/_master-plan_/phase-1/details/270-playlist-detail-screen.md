# 270-playlist-detail-screen

**Master step:** 9.11
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Playlist detail screen via playlist resource endpoints.
- Header (title, owner, count) + ordered item list; item rows reuse episode/clip/track rows.
- Play playlist row seeds auto-queue later (Track 10.20); play/queue via stub/hook now.

## Acceptance criteria

- Playlist + items load from same endpoint semantics as web playlist page
- Layout mirrors web playlist page, adapted to RN, tokenized
- Item order preserved; loading/empty/error via 8.11

## Web parity references

- [`apps/web/src/app/playlist/[playlist_id]`](/apps/web/src/app/playlist),
  [`apps/web/src/components/Playlist`](/apps/web/src/components/Playlist)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
