# Android v4 storage spike — summary

Request: [00-REQUEST.md](00-REQUEST.md). Order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).
Prompts: [COPY-PASTA.md](COPY-PASTA.md).

iOS already showed that a signed-out v4 install keeps `SUBSCRIBED_PODCAST_IDS` and
`ADD_BY_RSS_PODCAST_FEED_URLS` readable after an in-place v5 install, and that the feed-list
objects parse into outlines. Android stores those keys in a different file (SQLite
`RKStorage`, table `catalystLocalStorage` in `@react-native-community/async-storage` 1.12.1).
v5 reads them with `@react-native-async-storage/async-storage` 2.2.0. The v4 package is
`com.podverse`. The committed v5 package is `com.podverse.app.next`, so a private build must
use `com.podverse` for this measurement only and then put the committed id back.

## What this set decides

1. After an in-place install, can v5 `AsyncStorage.getItem` read the two keys, and is each value
   longer than an empty array, with the same character length v4 stored?
2. On that same install, do the richer lists match the fixture: one subscribed object with a
   title and `feedUrls[0].url`, one Add by RSS object with a title and
   `addByRSSPodcastFeedUrl`, one address in `ADD_BY_RSS_PODCAST_FEED_URLS`, two outlines, zero
   skipped?

## Settled decisions

1. **Not the rehearsal.** Do not restore a database, start a rehearsal stage, or edit doc 16 or
   doc 17.
2. **Do not edit doc 08.** Write `.llm/plans/active/android-v4-storage-spike/FINDINGS.md`. The
   operator copies a passing result into doc 08 later.
3. **Do not edit `../podverse-rn`.** If the v4 debug build fails, record the failure and stop.
4. **Do not change the committed store id.** `apps/mobile/app.config.ts` may say
   `com.podverse` only while the private build is being made. Prompt 02 puts
   `com.podverse.app.next` back. Do not commit that file in either state.
5. **One emulator.** `Pixel_6_Pro_API_33`. Never `Pixel_6_Pro_API_33_e2e`. Never a bare
   `--device` flag.
6. **Do not uninstall** between the v4 install and the v5 read. An uninstall deletes the
   measurement.
7. **Fixture addresses** use `example.com` only. Findings record lengths and counts, never
   titles, addresses, or file text.
8. **Leave Firebase out of the private build** with `EXPO_PUBLIC_MOBILE_PUSH_PROVIDER=none` on
   that command only. Do not write that into a committed env file. The spike does not need push.
9. **Same debug signature.** Do not set a release keystore. If install reports
   `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, stop. Do not uninstall to force the install.
10. **versionCode** of the private build is the installed v4 `versionCode` plus 1. v4's arm64
    split is `5280 * 1000 + 3`. Read the installed value from the device anyway.
