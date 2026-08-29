# 269-library-playlists-list

**Master step:** 9.10
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- My Library — playlists list via playlist request wrappers on `ApiRequestService`.
- Screen under the My Library stack (Track 7.4); playlist rows (title, item count, owner).
- Tap → playlist detail (9.11); loading/empty/error via 8.11.

## Acceptance criteria

- Playlists load from same endpoint semantics as web playlists page
- Row layout mirrors web playlists list, adapted to RN, tokenized
- Auth-gated: anonymous sees appropriate empty/sign-in prompt

## Web parity references

- [`apps/web/src/app/playlists`](/apps/web/src/app/playlists),
  [`apps/web/src/components/List/Playlists`](/apps/web/src/components/List/Playlists)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
