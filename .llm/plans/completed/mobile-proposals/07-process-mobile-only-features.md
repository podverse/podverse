# 07 — Mobile-only features and platform differences

## Scope

Generate a proposal cataloging **major categorical differences** between web and mobile — features
mobile must implement that web does not (or implements differently).

**Output file:** `docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md`

Docs only — no code changes. Can run in parallel with 05 and 06.

## Required document sections

For **each** category below, include: web status (paths or "not implemented"), mobile requirement,
recommended libraries/approach, API endpoints if any, LLM guidance (what to read / avoid).

### Categories (required sections)

1. **Offline downloads and local playback**
   - Web: `downloadEpisodeWithModal`, `utils/fileDownloader.ts` (browser download, not app storage)
   - Mobile: download manager, storage quotas, offline queue, play from `file://` or app sandbox
   - Propose architecture: download job queue, metadata DB, integration with playback bridge

2. **Background audio and OS media controls**
   - Web: `<audio>` + page visibility; limited lock-screen control
   - Mobile: foreground service (Android), audio session (iOS), lock screen, Bluetooth controls
   - Reference `react-native-track-player` as baseline; link car doc

3. **CarPlay and Android Auto**
   - Summarize native layer + cache; link initial-decisions car doc in depth
   - Spike criteria (app closed, DHU, CarPlay simulator)

4. **Push notifications**
   - Web: `apps/web/src/contexts/Notifications.tsx`, webpush, SW
   - API: `POST /account/fcm-device/create`, webpush device routes in `apps/api/src/routes/account.ts`
   - Mobile: FCM/APNs; existing `packages/helpers-requests/src/api/account/fcm/`

5. **Secure auth token storage**
   - Web: HttpOnly cookie `jwt`
   - Mobile: Keychain/Keystore; refresh rotation via `/auth/mobile/refresh`
   - `AuthContext` bearer mode in `http-request-core`

6. **Deep linking and universal links**
   - Web: Next routes in `apps/web/src/constants/routes.ts`
   - Mobile: map `channel_id`, `item_id`, `playlist_id` to screens; cold start handling

7. **Membership and payments**
   - Web: PayPal checkout pages under `apps/web/src/app/checkout/`, `membership/`
   - Mobile: IAP vs in-app browser vs external; API `paypal`, `membershipClaimToken`, product routes
   - Recommend phased approach for small team

8. **Local settings and preferences**
   - Web: `localSettings` cookie (`apps/web/src/utils/localSettings/`)
   - Mobile: AsyncStorage/MMKV; sync playback prefs to `account-settings` when logged in

9. **File system and permissions**
   - Storage permission flows (Android); iOS background modes in `Info.plist`

10. **App lifecycle**
    - Cold start, background, killed-state resume; contrast web SSR

11. **Analytics / stats**
    - Reuse `reqStats*` — same endpoints; mobile client identifiers

12. **Add-by-RSS on mobile**
    - Web: `apps/web/src/app/add-by-rss/`; queue resource types for add-by-rss
    - Mobile: simplified UX + same API mutations

### Cross-cutting section

- **Feature priority table** — P0 (ship blocker) / P1 / P2 for v1 mobile MVP
- **Dependencies between features** — e.g. background audio before CarPlay
- **LLM pitfalls** — table of common mistakes per category

## Exploration checklist

- [apps/web/src/contexts/Notifications.tsx](/apps/web/src/contexts/Notifications.tsx)
- [apps/web/src/utils/fileDownloader.ts](/apps/web/src/utils/fileDownloader.ts) or similar
- [apps/web/src/utils/localSettings/](/apps/web/src/utils/localSettings/)
- [apps/api/src/routes/account.ts](/apps/api/src/routes/account.ts) — device registration
- [docs/proposals/mobile/initial-decisions/](/docs/proposals/mobile/initial-decisions/)

## Diagram

Mermaid: mobile platform services layer (DownloadManager, PushService, NativeAudio, CarNative,
SecureStorage) under RN app shell.

## Conventions

Markdown ≤100 cols. Link to overview (04) and shared-vs-divergent (05).

## Verification

```bash
test -f docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md
```
