# 273-library-my-clips

**Master step:** 9.14
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- My Library — my clips screen listing the authenticated user's clips via clip request wrappers.
- Clip rows reuse the clip row (8.6); tap → clip detail (9.7).
- Clip authoring/upload is explicitly deferred (Track 21.4) — this is list/browse only.

## Acceptance criteria

- User's clips load from same endpoint semantics as web my-clips page
- Layout mirrors web my-clips page, adapted to RN, tokenized
- Auth-gated; loading/empty/error via 8.11

## Web parity references

- [`apps/web/src/app/my-clips`](/apps/web/src/app/my-clips),
  [`apps/web/src/components/List/Clips`](/apps/web/src/components/List/Clips)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
