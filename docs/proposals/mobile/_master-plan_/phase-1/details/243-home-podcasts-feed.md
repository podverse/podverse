# 243-home-podcasts-feed

**Master step:** 8.4
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Podcasts view of Home: subscribed channels list via the channel request wrappers on
  `ApiRequestService` (subscribed filter), mirroring web home podcasts logic.
- Render a reusable channel row (artwork + title + metadata) in a `FlatList`; tap → detail (8.12).
- Support pagination/infinite scroll consistent with web page size where applicable.
- Anonymous users: mirror web behavior (empty/subscribe prompt) — see state handling (8.11).

## Acceptance criteria

- Subscribed podcasts load from the same endpoint semantics as web
- Row layout mirrors web podcasts list rows, adapted to RN, tokenized
- Loading/empty/error handled via the shared state handler (8.11)

## Web parity references

- List: [`apps/web/src/components/List/Podcasts`](/apps/web/src/components/List/Podcasts),
  [`HomePageList.tsx`](/apps/web/src/app/HomePageList.tsx)
- Request service: `createMobileApiRequestService()` channel `req*` methods
  ([mobile-react-native rule](/.cursor/rules/mobile-react-native.mdc))
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
