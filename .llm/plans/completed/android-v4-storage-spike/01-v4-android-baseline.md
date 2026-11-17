# 01 — v4 Android baseline

**Cursor model:** Opus 5.5 · **Reasoning:** high

Leave a signed-out v4 debug app on `Pixel_6_Pro_API_33` with four AsyncStorage values in
`RKStorage`. Record character lengths. Do not install v5 in this prompt.

## Start

From the monorepo root, if `pgrep -fl v4RunFullRehearsal` prints a process, stop this turn.
Write nothing.

The v4 checkout is the sibling `../podverse-rn`. If `git -C ../podverse-rn status --porcelain`
is not empty, stop this turn. Do not edit that checkout.

## Emulator

Boot the existing AVD `Pixel_6_Pro_API_33`. Do not create an AVD. Do not boot
`Pixel_6_Pro_API_33_e2e`. If that manual AVD is missing, write `FINDINGS.md` with
`android_avd=missing` and stop.

Wait until `adb devices` shows the emulator as `device`. This is the only Android device for
the rest of the set. Confirm `adb -s <serial> shell getprop ro.product.model` and
`ro.build.version.release`, and record the model and the OS version in `FINDINGS.md`.

## v4 debug install

In `../podverse-rn`, install the debug app onto that serial. Do not pass a bare `--device`
flag. Do not change Gradle, the package id, or the version code. The app id is already
`com.podverse`.

Debug JS is not bundled, so the v4 packager has to be up for the first launch. After the app
has opened once, force-stop `com.podverse` and stop that packager so port 8081 is free for v5.

If the build fails, append the failure name (JDK, SDK, Gradle task) to `FINDINGS.md` and stop.
Do not patch `../podverse-rn`.

## Seed

The database is `/data/data/com.podverse/databases/RKStorage`, table `catalystLocalStorage`,
columns `key` and `value`. v4 creates it on first AsyncStorage use. Force-stop the app before
copying the file. If a `-wal` file exists, checkpoint it, then insert, then remove `-wal` and
`-shm` on the device so an old log cannot hide the insert. Use host `sqlite3` when the
emulator has no `sqlite3`. `run-as com.podverse` is how the file is pulled and pushed. Restore
the file mode you found.

Insert these four rows (`INSERT OR REPLACE`). Values are JSON text:

| key | value |
| --- | --- |
| `SUBSCRIBED_PODCAST_IDS` | `["spikeA1"]` |
| `SUBSCRIBED_PODCASTS` | `[{"id":"spikeA1","title":"Spike Show","feedUrls":[{"url":"https://example.com/android-spike/subscribed.xml"}]}]` |
| `ADD_BY_RSS_PODCAST_FEED_URLS` | `["https://example.com/android-spike/add.xml"]` |
| `ADD_BY_RSS_PODCASTS` | `[{"addByRSSPodcastFeedUrl":"https://example.com/android-spike/add.xml","title":"Spike Add"}]` |

Read the two key lengths back from the database after the push. Record in `FINDINGS.md`:

- `platform=android`
- model and OS version
- `v4_version_code=` from `dumpsys package com.podverse`
- `SUBSCRIBED_PODCAST_IDS` present and character length
- `ADD_BY_RSS_PODCAST_FEED_URLS` present and character length
- `fixture_subscribed_objects=1`
- `fixture_add_by_rss_objects=1`
- `fixture_add_by_rss_addresses=1`

Do not write the JSON into `FINDINGS.md`.

Leave the emulator running. Leave `com.podverse` installed. Do not uninstall. Do not start v5.
Do not commit. This prompt does not archive the set.

## Reply

`FINDINGS.md` path, the two lengths, the installed version code, and whether `../podverse-rn`
is still clean. Prompt 02 needs the emulator still booted and the app still installed.
