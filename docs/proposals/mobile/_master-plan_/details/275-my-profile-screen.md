# 275-my-profile-screen

**Master step:** 9.16
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- My profile screen for the authenticated user via my-profile request wrappers.
- Shows the user's own content sections + edit entry points (profile edit itself may be minimal v1).
- Reuse list rows and state components; auth-gated.

## Acceptance criteria

- Authenticated user's profile loads from same endpoint semantics as web my-profile page
- Layout mirrors web my-profile page, adapted to RN, tokenized
- Uses authenticated-user serializer semantics; loading/empty/error via 8.11

## Web parity references

- [`apps/web/src/app/my-profile`](/apps/web/src/app/my-profile)
  (`MyProfilePageClient.tsx`, `MyProfilePageContentList.tsx`)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
