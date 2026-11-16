# 02 — v5 in-place read

**Cursor model:** Opus 5.5 · **Reasoning:** high

Install a private v5 debug build over the v4 app from prompt 01. Read the two keys and the
field counts. Put the committed package id back. Remove the temporary reader.

## Start

Read `FINDINGS.md`. If it says `android_avd=missing` or a v4 build failure, stop this turn.

`adb devices` must still show `Pixel_6_Pro_API_33`. `com.podverse` must still be installed.
If it is not, stop. Do not reinstall v4 and do not uninstall.

If `pgrep -fl v4RunFullRehearsal` prints a process, stop this turn.

## Private build identity

In `apps/mobile/app.config.ts` only:

- `android.package` becomes `com.podverse` for this build.
- `android.versionCode` becomes the `v4_version_code` in `FINDINGS.md` plus 1.

Leave `ios.bundleIdentifier` as `com.podverse.app.next`.

Build and install with the monorepo Android command and `--device Pixel_6_Pro_API_33`. Put
`EXPO_PUBLIC_MOBILE_PUSH_PROVIDER=none` on that command only so Firebase stays out of this
build. Do not edit an env file. Do not upload the build.

Use the debug keystore Expo already uses. Do not configure a release keystore.

Install in place. Do not uninstall first. Do not pass `-d` unless the install reports a
version downgrade after the versionCode change; then fix the versionCode and install again
without uninstalling. If the install reports `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, append
`install=signature_mismatch` to `FINDINGS.md`, revert the steps below, and stop. Do not
uninstall.

## Read

Add a temporary log next to the existing carryover read in
`apps/mobile/src/migration/v4/readV4LocalState.ts`. If that file is absent on this branch,
add one temporary module that runs once on launch and delete it in the revert step. The log
uses `AsyncStorage.getItem` for the four keys. For each key print the key name, whether the
value is present, and the character length. Also print parsed counts only:

- subscribed objects, how many have a title, how many have `feedUrls[0].url`
- Add by RSS objects, how many have a title, how many have `addByRSSPodcastFeedUrl`
- addresses in `ADD_BY_RSS_PODCAST_FEED_URLS`
- outline count and skip count, using `carryoverOutlineCount` / `buildCarryoverOutlines` when
  that module exists

Do not print titles, addresses, or the stored strings. Do not read
`ADD_BY_RSS_PODCASTS_CREDENTIALS` or any token.

Launch the private build once. The carryover read runs once per install; a second launch can
skip it. Read the log with `adb logcat` filtered to the spike tag. Append the lengths and
counts to `FINDINGS.md`.

Pass when both key lengths equal the v4 lengths, each value is longer than `[]`, subscribed
counts are 1 / 1 / 1, Add by RSS counts are 1 / 1 / 1, addresses are 1, outlines are 2, and
skipped is 0. Any other result is a fail. Write `result=pass` or `result=fail`.

## Revert

Before this prompt ends, whether the result is pass or fail:

- Restore `apps/mobile/app.config.ts` so `android.package` is `com.podverse.app.next` and the
  temporary `versionCode` is gone. `git diff -- apps/mobile/app.config.ts` is empty.
- Remove the temporary log or temporary module. `git status --porcelain -- apps/mobile` shows
  no spike edits.
- `git -C ../podverse-rn status --porcelain` is empty.
- Do not commit. Do not edit doc 08.

Move this directory, including `FINDINGS.md`, to
`.llm/plans/completed/android-v4-storage-spike/`.

## Reply

Counts only: the two lengths, the field counts, outline count, skip count, `result`, and that
the package id is restored. Point at the completed `FINDINGS.md`. No verification command.
The operator reviews that file before anyone edits doc 08.
