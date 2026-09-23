# 782-per-type-channel-list-grid-prefs

**Master step:** P2.1.1 follow-up / P2.5.7
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

List vs grid for channel lists (podcasts, artists, albums) must be remembered independently.
A user may want a grid on Home Artists and a list on Browse Podcasts. Today:

| Surface       | Current store                                                    |
| ------------- | ---------------------------------------------------------------- |
| Mobile Browse | One `viewMode` on `{ kind: 'list', name: 'browse' }`             |
| Mobile Home   | One Home-wide `{ kind: 'list', name: 'home-layout' }`            |
| Web           | One global cookie `vs` (`grid` \| `rows`) for every ViewSelector |

`viewMode` already exists on the shared [`SortPrefValue`](/packages/helpers/src/lib/sortPrefs.ts).
Use it. Storage stays device-local (mobile AsyncStorage, web `local-settings` cookie `sp`).

This replaces the Home-wide layout choice recorded in
[708](708-home-view-toggle-and-overflow-menu.md).

## Locked decisions

- Independent per channel type on **Home and Browse (mobile)** and on **web** `/podcasts`,
  `/artists`, `/albums`, plus web Home medium chips.
- Web tokens stay `rows` \| `grid`. Mobile tokens stay `list` \| `grid`.
- Episodes, tracks, clips, livestreams, and add-by-RSS keep the global web `vs`.
- Do not write view mode into the URL.
- Upgrade fallbacks: per-type empty → previous screen-wide value (`browse` root, `home-layout`,
  or web `vs`) so a current grid user is not reset.
- Overflow / ViewSelector still only applies on channel-type chips (podcasts, artists, albums).
- Categories on Browse are a picker, not a view-mode scope.

## Scopes

| Surface       | Type            | Scope key                        |
| ------------- | --------------- | -------------------------------- |
| Mobile Home   | podcasts        | `podcasts` (existing sort scope) |
| Mobile Home   | artists         | `artists`                        |
| Mobile Home   | albums          | `albums`                         |
| Mobile Browse | podcasts        | `browse-podcasts`                |
| Mobile Browse | artists         | `browse-artists`                 |
| Mobile Browse | albums          | `browse-albums`                  |
| Web directory | podcasts        | `podcasts`                       |
| Web directory | artists         | `artists`                        |
| Web directory | albums          | `albums`                         |
| Web Home      | av              | `home-podcasts`                  |
| Web Home      | publisher-music | `home-artists`                   |
| Web Home      | music           | `home-albums`                    |

Mobile Home and web `/podcasts` may share the list name `podcasts` because the stores differ
(AsyncStorage vs cookie).

## Acceptance criteria

- Switching Browse Artists to grid leaves Browse Podcasts on its own mode.
- Switching Home Artists to grid leaves Home Podcasts on its own mode.
- Switching web `/artists` to grid leaves `/podcasts` on its own mode.
- Web Home medium chips remember independently.
- First launch still defaults to list / rows.
- Unit tests cover per-type writes and upgrade fallbacks.
- E2E covers one independence pair on web and one on mobile Browse.

## Web parity references

- Shared keys: [`packages/helpers/src/lib/sortPrefs.ts`](/packages/helpers/src/lib/sortPrefs.ts)
- Contract: [714](714-filter-sort-persistence.md), [715](715-web-filter-sort-persistence.md)
- Mobile Home: [`apps/mobile/src/prefs/homeListPrefs.ts`](/apps/mobile/src/prefs/homeListPrefs.ts)
- Mobile Browse: [`apps/mobile/src/screens/browse/browseListPrefs.ts`](/apps/mobile/src/screens/browse/browseListPrefs.ts)
- Web cookie `sp`: [`apps/web/src/utils/localSettings/sortPrefs.ts`](/apps/web/src/utils/localSettings/sortPrefs.ts)
- Web global `vs`: [`apps/web/src/contexts/LocalSettings.tsx`](/apps/web/src/contexts/LocalSettings.tsx)

## Verification

```bash
npm --prefix apps/mobile run test -- src/prefs/homeListPrefs.test.ts
npm --prefix apps/mobile run test -- src/screens/browse/browseListPrefs.ts
npm run test -w apps/web
npm run mobile:e2e:test -- browse
make e2e_test_web_report_spec SPEC=e2e/artists-list-date-and-view.spec.ts
```
