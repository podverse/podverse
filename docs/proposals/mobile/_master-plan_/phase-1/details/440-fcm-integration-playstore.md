# 440-fcm-integration-playstore

**Master step:** 14.1
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Integrate push messaging for the **playstore flavor** (greenfield on mobile). Choose
  `@react-native-firebase/messaging` or `expo-notifications` (recommend confirming against Expo SDK
  peer pins — **mobile-expo-monorepo**). Document the choice.
- Acquire and refresh the FCM token; expose a token accessor + refresh listener for the register
  step (14.2).
- Keep push code **flavor-isolated** so the FOSS flavor (14.6 / Track 20) can swap in UnifiedPush
  without Firebase.

## Acceptance criteria

- SDK installed via `npm --prefix apps/mobile exec -- expo install …`; app builds.
- FCM token obtainable at runtime on Android (iOS via APNs+FCM if using RN Firebase).
- Push module boundary is flavor-swappable (no Firebase symbols leak into shared code paths).

## Web parity references

- `apps/web/src/contexts/Notifications.tsx` (web push/UP reference; not FCM).
- Skills: **mobile-expo-monorepo** (peer pins), **mobile-fdroid-flavors** (flavor isolation),
  **native-deps-platform-mismatch**.

## Operator-only

- Firebase project, `google-services.json` (Android) / `GoogleService-Info.plist` (iOS), APNs auth
  key upload to Firebase.

## Verification

```bash
grep -rq "messaging\|expo-notifications" apps/mobile/package.json
```
