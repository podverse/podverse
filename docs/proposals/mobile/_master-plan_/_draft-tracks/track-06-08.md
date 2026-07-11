# Draft: Tracks 6, 7, 8 — auth, navigation, home

Reference:
[DOCS-MOBILE-PROCESS-OVERVIEW.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-OVERVIEW.md)

**Navigation:** Bottom tabs MUST be **Home**, **Search**, **My Library**, **RSS**, **More** (My Library
consolidates library/playlists; RSS tab is dedicated to Add-by-RSS features).

**Home:** Side-scrolling **media-type selector** with Podcasts, Episodes, Clips, Artists, Albums, Tracks.

## Track 6 — Bearer auth + secure storage

6.1. Add `expo-secure-store` or `react-native-keychain` for access/refresh token storage. Model: Codex 5.3. Detail: [200-secure-storage-dependency](/docs/proposals/mobile/_master-plan_/details/200-secure-storage-dependency.md) — _TBD_
6.2. Implement auth store (Zustand or context) holding bearer token and user session state. Model: Codex 5.3. Detail: [201-auth-store](/docs/proposals/mobile/_master-plan_/details/201-auth-store.md) — _TBD_
6.3. Wire `POST /auth/mobile/token` via `req*` wrapper with `AuthContext { mode: 'bearer' }`. Model: Codex 5.3. Detail: [202-mobile-token-login](/docs/proposals/mobile/_master-plan_/details/202-mobile-token-login.md) — _TBD_
6.4. Implement token refresh via `POST /auth/mobile/refresh` on 401 with rotation handling. Model: Opus 4.8. Detail: [203-token-refresh](/docs/proposals/mobile/_master-plan_/details/203-token-refresh.md) — _TBD_
6.5. Implement logout via `POST /auth/mobile/revoke` and local secure storage wipe. Model: Codex 5.3. Detail: [204-logout-revoke](/docs/proposals/mobile/_master-plan_/details/204-logout-revoke.md) — _TBD_
6.6. Build login screen mirroring web auth fields and error states. Model: Codex 5.3. Detail: [205-login-screen](/docs/proposals/mobile/_master-plan_/details/205-login-screen.md) — _TBD_
6.7. Build signup screen with validation from `@podverse/helpers-validation/client`. Model: Codex 5.3. Detail: [206-signup-screen](/docs/proposals/mobile/_master-plan_/details/206-signup-screen.md) — _TBD_
6.8. Implement `GET /auth/me` bootstrap on app launch for session restore. Model: Codex 5.3. Detail: [207-auth-me-bootstrap](/docs/proposals/mobile/_master-plan_/details/207-auth-me-bootstrap.md) — _TBD_
6.9. Implement anonymous mode: no token, limited features, anonymous playback snapshot. Model: Opus 4.8. Detail: [208-anonymous-mode](/docs/proposals/mobile/_master-plan_/details/208-anonymous-mode.md) — _TBD_
6.10. Never use cookies or `withCredentials` in mobile API client configuration. Model: Auto. Detail: [209-no-cookie-auth](/docs/proposals/mobile/_master-plan_/details/209-no-cookie-auth.md) — _TBD_
6.11. E2E: login flow with screenshot of authenticated home shell. Model: Codex 5.3. Detail: [210-e2e-login-screenshot](/docs/proposals/mobile/_master-plan_/details/210-e2e-login-screenshot.md) — _TBD_
6.12. E2E: logout flow returning to login screen. Model: Auto. Detail: [211-e2e-logout](/docs/proposals/mobile/_master-plan_/details/211-e2e-logout.md) — _TBD_

## Track 7 — Navigation shell (tabs + stacks)

7.1. Add React Navigation with bottom tab navigator (5 tabs per spec). Model: Codex 5.3. Detail: [220-tab-navigator-scaffold](/docs/proposals/mobile/_master-plan_/details/220-tab-navigator-scaffold.md) — _TBD_
7.2. Create Home tab nested stack for podcast → episode → clip push navigation. Model: Codex 5.3. Detail: [221-home-stack](/docs/proposals/mobile/_master-plan_/details/221-home-stack.md) — _TBD_
7.3. Create Search tab nested stack for search results and detail pushes. Model: Codex 5.3. Detail: [222-search-stack](/docs/proposals/mobile/_master-plan_/details/222-search-stack.md) — _TBD_
7.4. Create My Library tab stack: playlists, history, queues, downloads entry points. Model: Codex 5.3. Detail: [223-library-stack](/docs/proposals/mobile/_master-plan_/details/223-library-stack.md) — _TBD_
7.5. Create RSS tab stack dedicated to Add-by-RSS flows (feeds Track 9 RSS screen). Model: Codex 5.3. Detail: [224-rss-tab-stack](/docs/proposals/mobile/_master-plan_/details/224-rss-tab-stack.md) — _TBD_
7.6. Create More tab stack: settings, profile, about, membership links. Model: Codex 5.3. Detail: [225-more-stack](/docs/proposals/mobile/_master-plan_/details/225-more-stack.md) — _TBD_
7.7. Implement persistent mini player slot above tab bar on all tabs. Model: Opus 4.8. Detail: [226-mini-player-slot](/docs/proposals/mobile/_master-plan_/details/226-mini-player-slot.md) — _TBD_
7.8. Wire full player as modal or stack screen over tabs without unmounting mini slot engine. Model: Opus 4.8. Detail: [227-full-player-modal](/docs/proposals/mobile/_master-plan_/details/227-full-player-modal.md) — _TBD_
7.9. Define deep link route config mirroring web resource ids (placeholder for Track 15). Model: Codex 5.3. Detail: [228-linking-config-stub](/docs/proposals/mobile/_master-plan_/details/228-linking-config-stub.md) — _TBD_
7.10. Handle Android back button: mini player → full player → tab stack pop order. Model: Codex 5.3. Detail: [229-android-back-behavior](/docs/proposals/mobile/_master-plan_/details/229-android-back-behavior.md) — _TBD_
7.11. Support tablet: optional side rail or two-column layout at wide breakpoints. Model: Codex 5.3. Detail: [230-tablet-nav-adaptive](/docs/proposals/mobile/_master-plan_/details/230-tablet-nav-adaptive.md) — _TBD_
7.12. E2E: tab switching preserves playback state screenshot test. Model: Codex 5.3. Detail: [231-e2e-tab-switch-playback](/docs/proposals/mobile/_master-plan_/details/231-e2e-tab-switch-playback.md) — _TBD_

## Track 8 — Home screen + media-type selector

8.1. Build Home screen layout with horizontal media-type selector chip row. Model: Codex 5.3. Detail: [240-home-screen-layout](/docs/proposals/mobile/_master-plan_/details/240-home-screen-layout.md) — _TBD_
8.2. Media-type selector options: Podcasts, Episodes, Clips, Artists, Albums, Tracks. Model: Auto. Detail: [241-media-type-selector-chips](/docs/proposals/mobile/_master-plan_/details/241-media-type-selector-chips.md) — _TBD_
8.3. Persist selected media type in device prefs (reuse web `preferred_media_type` semantics). Model: Codex 5.3. Detail: [242-media-type-pref-sync](/docs/proposals/mobile/_master-plan_/details/242-media-type-pref-sync.md) — _TBD_
8.4. Podcasts view: subscribed channels list via `reqChannelGetMany` (subscribed filter). Model: Codex 5.3. Detail: [243-home-podcasts-feed](/docs/proposals/mobile/_master-plan_/details/243-home-podcasts-feed.md) — _TBD_
8.5. Episodes view: recent episodes from subscriptions (match web home episode logic). Model: Codex 5.3. Detail: [244-home-episodes-feed](/docs/proposals/mobile/_master-plan_/details/244-home-episodes-feed.md) — _TBD_
8.6. Clips view: clip discovery feed via `reqClip*` public/list endpoints. Model: Codex 5.3. Detail: [245-home-clips-feed](/docs/proposals/mobile/_master-plan_/details/245-home-clips-feed.md) — _TBD_
8.7. Artists view: music artist channels browse (mirror web artist routes). Model: Codex 5.3. Detail: [246-home-artists-feed](/docs/proposals/mobile/_master-plan_/details/246-home-artists-feed.md) — _TBD_
8.8. Albums view: music album channels browse (mirror web album routes). Model: Codex 5.3. Detail: [247-home-albums-feed](/docs/proposals/mobile/_master-plan_/details/247-home-albums-feed.md) — _TBD_
8.9. Tracks view: music tracks/items list (mirror web music item browsing). Model: Codex 5.3. Detail: [248-home-tracks-feed](/docs/proposals/mobile/_master-plan_/details/248-home-tracks-feed.md) — _TBD_
8.10. Implement pull-to-refresh on Home for each media-type sub-feed. Model: Codex 5.3. Detail: [249-home-pull-to-refresh](/docs/proposals/mobile/_master-plan_/details/249-home-pull-to-refresh.md) — _TBD_
8.11. Loading, empty, and error states per media type matching web semantics. Model: Codex 5.3. Detail: [250-home-state-handling](/docs/proposals/mobile/_master-plan_/details/250-home-state-handling.md) — _TBD_
8.12. Tap row navigates to correct detail screen in Home stack. Model: Codex 5.3. Detail: [251-home-row-navigation](/docs/proposals/mobile/_master-plan_/details/251-home-row-navigation.md) — _TBD_
8.13. Play action on row integrates with queue/player hooks (stub until Track 10). Model: Codex 5.3. Detail: [252-home-play-action-stub](/docs/proposals/mobile/_master-plan_/details/252-home-play-action-stub.md) — _TBD_
8.14. E2E: screenshot each media-type selector state on Home. Model: Auto. Detail: [253-e2e-home-media-types-screenshots](/docs/proposals/mobile/_master-plan_/details/253-e2e-home-media-types-screenshots.md) — _TBD_
8.15. E2E: swipe horizontal selector and verify feed content changes. Model: Auto. Detail: [254-e2e-media-type-swipe](/docs/proposals/mobile/_master-plan_/details/254-e2e-media-type-swipe.md) — _TBD_
