# 03 — v5 in-place read with matching debug key

**Cursor model:** Opus 5.5 · **Reasoning:** high

Retry the private v5 install over the seeded v4 app. Sign the build with
`~/.android/debug.keystore` (the same key the installed v4 app uses). Read the keys and
counts. Put the committed package id back. Remove the temporary reader.

## Start

Read `FINDINGS.md`. Stop if it says `android_avd=missing`, a v4 build failure, or
`baseline=missing`.

If `pgrep -fl v4RunFullRehearsal` prints a process, stop this turn. If
`git -C ../podverse-rn status --porcelain` is not empty, stop this turn.

Boot `Pixel_6_Pro_API_33` with a normal boot. Do not use `-wipe-data`. Clear a stale AVD lock
if needed. Dismiss the Bluetooth dialog if it appears. Confirm `pm path com.podverse` and
versionCode 5280. Pull `RKStorage` through `run-as` and confirm the two key lengths are still
11 and 45. If either is missing, append `baseline=missing` and stop. Do not reinstall v4. Do
not uninstall.

## Private build identity

In `apps/mobile/app.config.ts` only:

- `android.package` becomes `com.podverse` for this build.
- `android.versionCode` becomes 5281.

Leave `ios.bundleIdentifier` as `com.podverse.app.next`.

Add a temporary log tagged `v4-storage-spike` in
`apps/mobile/src/migration/v4/readV4LocalState.ts`. For each of the four keys print the key
name, whether the value is present, and the character length. Also print:

- subscribed objects, how many have a title, how many have `feedUrls[0].url`
- Add by RSS objects, how many have a title, how many have `addByRSSPodcastFeedUrl`
- addresses in `ADD_BY_RSS_PODCAST_FEED_URLS`
- outline count and skip count from `buildCarryoverOutlines` / `carryoverOutlineCount`

Do not print titles, addresses, or the stored strings.

## Prebuild and key

```bash
env CI=1 EXPO_PUBLIC_MOBILE_PUSH_PROVIDER=none npm --prefix apps/mobile run prebuild -- --platform android --no-install
```

Copy `~/.android/debug.keystore` over `apps/mobile/android/app/debug.keystore`. Confirm the
generated `app/build.gradle` debug `signingConfig` points at that file with `androiddebugkey`
/ `android`. Confirm with `keytool -list -v` that the fingerprint starts with `D4:CB`. Stop if
it does not.

## Install

Start Metro with `env EXPO_PUBLIC_MOBILE_PUSH_PROVIDER=none npm run mobile:dev`. Run
`adb reverse tcp:8081 tcp:8081` and clear logcat. Then:

```bash
env EXPO_PUBLIC_MOBILE_PUSH_PROVIDER=none npm run mobile:android -- --device Pixel_6_Pro_API_33
```

Install in place. Do not uninstall. If the install reports any `INSTALL_FAILED_*` code, append
it to `FINDINGS.md`, revert, and stop.

## Read

Confirm `com.podverse` shows versionCode 5281 and the same signer. Capture `adb logcat`
filtered to `v4-storage-spike`. Count `AndroidRuntime` FATAL lines for `com.podverse`
(expected 0). Take one screenshot of the v5 screen that lists the carried-over subscriptions
for the chat reply only.

Append to `FINDINGS.md`:

- `install_retry=matching_debug_key`
- the v5 key lengths
- the field counts
- `outlines=` and `skipped=`
- `fatal_crashes=`
- `result=pass` or `result=fail`

Pass when both key lengths equal 11 and 45, each value is longer than `[]`, subscribed counts
are 1 / 1 / 1, Add by RSS counts are 1 / 1 / 1, addresses are 1, outlines are 2, and skipped is
0.

## Revert

Before this prompt ends, whether the result is pass or fail:

- Restore `apps/mobile/app.config.ts` and `readV4LocalState.ts`.
- Delete the generated `apps/mobile/android/`.
- Stop Metro.
- `git status --porcelain -- apps/mobile` shows no spike edits.
- `git -C ../podverse-rn status --porcelain` is empty.
- Do not commit. Do not edit doc 08.

Move this directory, including `FINDINGS.md`, to
`.llm/plans/completed/android-v4-storage-spike/`.

## Reply

Counts only: the two lengths, the field counts, outline count, skip count, `result`, and that
the package id is restored. Point at the completed `FINDINGS.md`. No verification command.
