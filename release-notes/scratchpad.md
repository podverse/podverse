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

## v4 public ids of 7 characters fit the app database

- Surfaces: api database, management database, orm, k8s
- Change: `nano_id_v2` accepts 7–15 characters. New ids stay 10. Account, channel, item, clip, playlist, chapter, and soundbite keep an id that was already set. `account.v4_library_copied_at` and `legacy_id_map` exist and are empty.
- Who notices: a stored v4 id shorter than 9 characters can be saved. Listeners see no change until a library copy uses those columns.
- Operator steps: apply the app migration `0005_v4_rehearsal_schema.sql` and the management migration `0002_nano_id_v2_min_7.sql` before a process expects them.

## Local mobile builds read Firebase paths from .env

- Surfaces: mobile
- Change: pod install and Gradle load `apps/mobile/.env`, so a local iOS or Android build links Firebase when those paths are set. `make local_env_setup` copies the paths from `mobile-firebase.env` in the home overrides.
- Who notices: operators building the mobile app on a machine that has the Firebase client files
- Operator steps: put the two paths in `~/.config/podverse/local-env-overrides/mobile-firebase.env`, run `make local_env_link` and `make local_env_setup`, then prebuild as usual
