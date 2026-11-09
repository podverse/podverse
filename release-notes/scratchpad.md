## Test push launcher accepts email

- Surfaces: ops
- Change: `npm run notifications:test-push:k8s` passes `--email` through to the Job, prints the CronJob image, and follows the Job logs.
- Who notices: operators sending a test push on alpha
- Operator steps: run it from a checkout that has this script; the workers image on the cluster still has to understand `--email`

## Mobile registers an FCM token

- Surfaces: mobile
- Change: iOS and Android store builds read the Firebase registration token instead of the Apple device token, so a test push can reach an iPhone. Builds without the Google services files, and UnifiedPush builds, leave React Native Firebase unlinked. `expo-notifications` still includes Firebase Messaging on Android, so an F-Droid binary is not ready until that dependency is removed.
- Who notices: iOS listeners who allow push, after they install a rebuilt app; F-Droid is unchanged until that later build
- Operator steps: set `GOOGLE_SERVICES_INFO_PLIST` and `GOOGLE_SERVICES_JSON` as EAS file variables, upload an APNs auth key in Firebase, then rebuild and reinstall the app

## Local mobile builds read Firebase paths from .env

- Surfaces: mobile
- Change: pod install and Gradle load `apps/mobile/.env`, so a local iOS or Android build links Firebase when those paths are set. `make local_env_setup` copies the paths from `mobile-firebase.env` in the home overrides.
- Who notices: operators building the mobile app on a machine that has the Firebase client files
- Operator steps: put the two paths in `~/.config/podverse/local-env-overrides/mobile-firebase.env`, run `make local_env_link` and `make local_env_setup`, then prebuild as usual
