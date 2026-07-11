# Authoring: Tracks 6, 7, 8 — auth, navigation, home

**Phase:** B (parallel). **Output file:**
`docs/proposals/mobile/_master-plan_/_draft-tracks/track-06-08.md`

**Detail ID range:** 200–259

## Navigation constraint (operator-specified)

Bottom tabs MUST be: **Home**, **Search**, **My Library**, **RSS**, **More** (not the older
proposal's Playlists/Profile split — My Library consolidates library/playlists; RSS tab is dedicated
to Add-by-RSS features).

Home screen MUST include side-scrolling **media-type selector**: Podcasts, Episodes, Clips, Artists,
Albums, Tracks.

Reference:
[DOCS-MOBILE-PROCESS-OVERVIEW.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-OVERVIEW.md)

Emit master-plan lines with **Model** on each step (see 01-authoring file).

## Track 6 — Bearer auth + secure storage

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 6.1 | Add `expo-secure-store` or `react-native-keychain` for access/refresh token storage. | Codex 5.3 | 200-secure-storage-dependency |
| 6.2 | Implement auth store (Zustand or context) holding bearer token and user session state. | Codex 5.3 | 201-auth-store |
| 6.3 | Wire `POST /auth/mobile/token` via `req*` wrapper with `AuthContext { mode: 'bearer' }`. | Codex 5.3 | 202-mobile-token-login |
| 6.4 | Implement token refresh via `POST /auth/mobile/refresh` on 401 with rotation handling. | Opus 4.8 | 203-token-refresh |
| 6.5 | Implement logout via `POST /auth/mobile/revoke` and local secure storage wipe. | Codex 5.3 | 204-logout-revoke |
| 6.6 | Build login screen mirroring web auth fields and error states. | Codex 5.3 | 205-login-screen |
| 6.7 | Build signup screen with validation from `@podverse/helpers-validation/client`. | Codex 5.3 | 206-signup-screen |
| 6.8 | Implement `GET /auth/me` bootstrap on app launch for session restore. | Codex 5.3 | 207-auth-me-bootstrap |
| 6.9 | Implement anonymous mode: no token, limited features, anonymous playback snapshot. | Opus 4.8 | 208-anonymous-mode |
| 6.10 | Never use cookies or `withCredentials` in mobile API client configuration. | Auto | 209-no-cookie-auth |
| 6.11 | E2E: login flow with screenshot of authenticated home shell. | Codex 5.3 | 210-e2e-login-screenshot |
| 6.12 | E2E: logout flow returning to login screen. | Auto | 211-e2e-logout |

## Track 7 — Navigation shell (tabs + stacks)

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 7.1 | Add React Navigation with bottom tab navigator (5 tabs per spec). | Codex 5.3 | 220-tab-navigator-scaffold |
| 7.2 | Create Home tab nested stack for podcast → episode → clip push navigation. | Codex 5.3 | 221-home-stack |
| 7.3 | Create Search tab nested stack for search results and detail pushes. | Codex 5.3 | 222-search-stack |
| 7.4 | Create My Library tab stack: playlists, history, queues, downloads entry points. | Codex 5.3 | 223-library-stack |
| 7.5 | Create RSS tab stack dedicated to Add-by-RSS flows (feeds Track 9 RSS screen). | Codex 5.3 | 224-rss-tab-stack |
| 7.6 | Create More tab stack: settings, profile, about, membership links. | Codex 5.3 | 225-more-stack |
| 7.7 | Implement persistent mini player slot above tab bar on all tabs. | Opus 4.8 | 226-mini-player-slot |
| 7.8 | Wire full player as modal or stack screen over tabs without unmounting mini slot engine. | Opus 4.8 | 227-full-player-modal |
| 7.9 | Define deep link route config mirroring web resource ids (placeholder for Track 15). | Codex 5.3 | 228-linking-config-stub |
| 7.10 | Handle Android back button: mini player → full player → tab stack pop order. | Codex 5.3 | 229-android-back-behavior |
| 7.11 | Support tablet: optional side rail or two-column layout at wide breakpoints. | Codex 5.3 | 230-tablet-nav-adaptive |
| 7.12 | E2E: tab switching preserves playback state screenshot test. | Codex 5.3 | 231-e2e-tab-switch-playback |

## Track 8 — Home screen + media-type selector

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 8.1 | Build Home screen layout with horizontal media-type selector chip row. | Codex 5.3 | 240-home-screen-layout |
| 8.2 | Media-type selector options: Podcasts, Episodes, Clips, Artists, Albums, Tracks. | Auto | 241-media-type-selector-chips |
| 8.3 | Persist selected media type in device prefs (reuse web `preferred_media_type` semantics). | Codex 5.3 | 242-media-type-pref-sync |
| 8.4 | Podcasts view: subscribed channels list via `reqChannelGetMany` (subscribed filter). | Codex 5.3 | 243-home-podcasts-feed |
| 8.5 | Episodes view: recent episodes from subscriptions (match web home episode logic). | Codex 5.3 | 244-home-episodes-feed |
| 8.6 | Clips view: clip discovery feed via `reqClip*` public/list endpoints. | Codex 5.3 | 245-home-clips-feed |
| 8.7 | Artists view: music artist channels browse (mirror web artist routes). | Codex 5.3 | 246-home-artists-feed |
| 8.8 | Albums view: music album channels browse (mirror web album routes). | Codex 5.3 | 247-home-albums-feed |
| 8.9 | Tracks view: music tracks/items list (mirror web music item browsing). | Codex 5.3 | 248-home-tracks-feed |
| 8.10 | Implement pull-to-refresh on Home for each media-type sub-feed. | Codex 5.3 | 249-home-pull-to-refresh |
| 8.11 | Loading, empty, and error states per media type matching web semantics. | Codex 5.3 | 250-home-state-handling |
| 8.12 | Tap row navigates to correct detail screen in Home stack. | Codex 5.3 | 251-home-row-navigation |
| 8.13 | Play action on row integrates with queue/player hooks (stub until Track 10). | Codex 5.3 | 252-home-play-action-stub |
| 8.14 | E2E: screenshot each media-type selector state on Home. | Auto | 253-e2e-home-media-types-screenshots |
| 8.15 | E2E: swipe horizontal selector and verify feed content changes. | Auto | 254-e2e-media-type-swipe |

## Verification

- Tracks 6, 7, 8 complete with Detail IDs 200–254 and Model on every step.
- Tab names exactly: Home, Search, My Library, RSS, More.
- Six media types in selector documented.
