# 274-profile-screen

**Master step:** 9.15
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Public profile screen via profile request wrappers on `ApiRequestService`.
- Header (name, image) + public content sections (subscribed podcasts / playlists / clips as web
  exposes them); params: `id_text`.
- Reuse list rows from Tracks 8–9; loading/empty/error via 8.11.

## Acceptance criteria

- Public profile loads from same endpoint semantics as web profile page
- Layout mirrors web profile page, adapted to RN, tokenized
- Respects PII rules (public summary only for other users)

## Web parity references

- [`apps/web/src/app/profile/[id_text]`](/apps/web/src/app/profile),
  [`apps/web/src/components/List/Profiles`](/apps/web/src/components/List/Profiles)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
