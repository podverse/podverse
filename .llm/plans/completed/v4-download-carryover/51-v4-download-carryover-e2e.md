**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 51 — Device E2E: carry v4 downloads of the Podcasting 2.0 feed

## Rows

R7, R9, R12, R14, R15, R27

- R7: the passed iOS and Android storage spikes do not cover downloads (§ What the spikes do
  not cover). This flow is the first device proof that reads `DOWNLOADED_PODCASTS`,
  `DOWNLOADING_EPISODES`, and media files.
- R12: the flow carries files of the Podcasting 2.0 feed (Podcast Index `920666`) that plan 50
  seeds and copies to test-assets, and proves the three outcomes: directory episode, Add by RSS
  episode or local episode, deleted.
- R9, R14, R15: § Set notes.
- R27: after the pass, every name the fixture planted at the document root is gone, and the
  error log still shows the counts below. Both checks are in this flow.

## Runs after

20, 21, 30, 31, 32, 40, 41, 42, 50

## Files

apps/mobile/src/migration/v4/e2eFixture.ts
apps/mobile/src/migration/v4/v4DownloadFixtureFilesMarker.ts
apps/mobile/src/migration/v4/V4DownloadFixtureFilesMarker.tsx
apps/mobile/src/navigation/index.tsx
apps/mobile/App.tsx
apps/mobile/e2e/v4-download-carryover.yaml
scripts/mobile/e2e-test.sh
apps/mobile/e2e/HOW-TO-RUN.md
docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md

## Set notes

- **R9 — Branch.** The whole set runs on `feature/v4-migration-followups` in this checkout. No
  worktree.
- **R14 — One set or split runs.** One set. Matching a carried file and deleting one that
  cannot migrate are decided in one pass over the same staged rows (plans 41 and 42), so the
  two halves cannot ship apart.
- **R15 — Open questions.** Settled by the operator's answers recorded in `00-REQUEST.md`:
  - an unmigratable file is deleted with no screen and counted in the error log;
  - a file waiting on a lookup stays on disk;
  - being offline is not a failed match;
  - an episode missing from the parsed feed is kept as a local episode on its Add by RSS feed.

  This flow checks the first and the last answer on a device. The waiting and offline answers
  need a lookup that does not answer or a phone with no network. Maestro cannot cut the network
  (see `library-downloads.yaml`), so those two stay with plan 41's unit tests of the decision
  rules.

## What the spikes do not cover

The iOS and Android storage spikes (`.llm/plans/completed/android-v4-storage-spike/FINDINGS.md`,
and doc 08's open questions) passed. They prove only `SUBSCRIBED_PODCAST_IDS`,
`ADD_BY_RSS_PODCAST_FEED_URLS`, and outline counts. They never read `DOWNLOADED_PODCASTS`,
`DOWNLOADING_EPISODES`, `EXT_STORAGE_DLOAD_LOCATION`, or a media file, so they say nothing about
downloads.

This flow plants v4-shaped keys and files in `documentDirectory` on a v5 E2E build. That covers
the iOS root and Android's `app_documents` root (plan 20). It does not cover Android's external
files folder (`app_external_files`) or a listener-chosen shared folder
(`EXT_STORAGE_DLOAD_LOCATION`); only a real v4 install upgraded in place exercises those. Their
path logic is in plan 20's unit tests.

## Doc 10

Doc 10 (`docs/proposals/v4-to-v5-migration/10-user-communication.md`) is not edited by this set.
Its line says the message must "not promise a local file the app cannot map". That still holds:

- unfinished downloads, files no v4 list named, and files of shows dropped as spam or takedown
  are deleted;
- a file whose show the phone cannot name is deleted after its retries.

This set maps more files than doc 10 assumed. A carried file with no matching feed item becomes
a local episode on an Add by RSS feed (plan 30). Rewriting the backup sentence is copy work for
the operator once the job ships. `00-REQUEST.md` asks to leave the sentence until this job exists.

## Reuse

- The fixture link follows `runV4E2eFixture` in `e2eFixture.ts`. It uses the same dev-E2E gate,
  the same `appPath` parser, the same `enqueueV4CarryoverWork` reset, and then
  `runV4CarryoverReadOnce`.
- File bytes come from the test-assets audio that `library-downloads.yaml` already plays,
  through `resolveE2eMediaUrl` (the loopback rewrite the download runner uses).
- The flow copies these steps:
  - opening the link from `v4-carryover-anonymous.yaml`;
  - the 1×1 E2E marker from `PlaybackE2eStatus` (`playback-source-e2e`): same gate, same
    absolute box, mounted beside it;
  - Library → Downloads, the episode-page play, and the `playback-source-e2e` check from
    `library-downloads.yaml`;
  - Library → Add by RSS → feed from `add-by-rss.yaml`;
  - More → Advanced → Error log from `add-by-rss-device-credentials.yaml`.

## Outcomes the fixture sets up

v4 data planted by the fixture. Plan 50 seeds the ids, guids, and titles, from the real feed.

| File key | v4 list | v4 podcast | Path through plans 41 and 42 | Status |
| --- | --- | --- | --- | --- |
| `v4Pc20Ep275.mp3` | `DOWNLOADED_PODCASTS` | `v4Pc20Pod01` (directory) | lookup → mapped `episode` row → item `e2ePc20Ep275` | `directory` |
| `v4Pc20Ep274.mp3` | `DOWNLOADED_PODCASTS` | `v4Pc20Pod01` (directory) | lookup → guid `PC20-274` in the mapped channel → item `e2ePc20Ep274` | `directory` |
| base64 of the 276 enclosure + `.mp3` | `DOWNLOADED_PODCASTS` | Add by RSS copy | `/channel/add-by-rss-match` finds no channel → stub followed → adopted; the parse of the copy lists guid `PC20-276`, so plan 30 absorbs it as a feed episode | `add_by_rss` |
| base64 of the 273 enclosure + `.mp3` | `DOWNLOADED_PODCASTS` | Add by RSS copy | same match; the copy does not list `PC20-273`, so it stays a local episode | `add_by_rss` |
| `v4E2eBlkEp1.mp3` | `DOWNLOADED_PODCASTS` | `v4E2eBlkd01` (dropped) | lookup → `blocked` | `deleted` |
| `v4Pc20Ep272.mp3` | `DOWNLOADING_EPISODES` | `v4Pc20Pod01` | partial, deleted before any request | `deleted` |
| `v4E2eOrphan1.mp3` | none | none | orphan, deleted before any request | `deleted` |

The expected error-log counts are: Directory Episodes 2, Add by RSS Episodes 2, Files
Deleted 3. Already Downloaded, Files Not Found, Files in an Unreadable Folder, Files Not
Deleted, and Files Waiting are each 0.

Those counts stay. They are not the only proof the planted files left the disk. The fixture
writes seven names at `FileSystem.documentDirectory` (not under `downloads/`):

- `v4Pc20Ep275.mp3`, `v4Pc20Ep274.mp3`, and the two Add by RSS base64 names are moved into
  `downloads/` under `v4-<episode id>-<hash>.<ext>` (plan 42). The planted name at the document
  root is gone. The copy under `downloads/` is what the play steps use.
- `v4E2eBlkEp1.mp3`, `v4Pc20Ep272.mp3`, and `v4E2eOrphan1.mp3` are deleted. Nothing replaces them.

The marker `v4-download-fixture-files-e2e` reads `none` only when all seven planted names are
absent at the document root. It does not look in `downloads/`. The flow asserts that text and
the eight log fields. A count with a planted name still at the root fails, and a cleared root
with the wrong count fails.

The flow does not use these paths:

- the lookup's `channel` and `feed_url` answers would parse or fetch a remote feed;
- `not_here` with no feed URL retries across five launches;
- nested base64 keys (with `/`) and the media-URL match.

Plan 10's integration test and plans 20 and 41's unit tests own those paths. No real
Podcasting 2.0 enclosure base64-encodes to a `/`, so this flow's keys are top-level files. They
end in `=` padding, which `isSafeV4FileKey` accepts.

The continue-migration screen does not appear: `tryOfferV4ContinueMigration` needs subscription
outline rows, and this fixture plants only download keys.

## 1. Fixture link — `apps/mobile/src/migration/v4/e2eFixture.ts`

Keep `runV4E2eFixture`, its constants, and `isV4E2eFixtureUrl` unchanged;
`v4-carryover-anonymous.yaml` still uses them. Add a second link in the same module, so both
fixtures share `appPath`.

Add imports (keep the file's import grouping and order):

```ts
import * as FileSystem from 'expo-file-system/legacy';

import { v4DownloadCarryoverRepository } from '../../data/repositories/v4DownloadCarryoverRepository';
import { resolveE2eMediaUrl } from '../../lib/e2e/resolveE2eMediaUrl';
import { V4_DOWNLOAD_STATE_KEYS } from './readV4DownloadState';
import { beginV4DownloadFixtureFilesCheck } from './v4DownloadFixtureFilesMarker';
```

Below `isV4E2eFixtureUrl`, add the module-private data and the two exports. Write the values
exactly; they match plan 50's seed and committed feed copy.

```ts
const DOWNLOAD_FIXTURE_PATH = '/e2e/v4-download-fixture';

/** Podcasting 2.0 (Podcast Index 920666). Ids match tools/web/seed-e2e.mjs. */
const PC20_PODCAST_ID = 'v4Pc20Pod01';
const PC20_TITLE = 'Podcasting 2.0';
const PC20_FEED_URL = 'https://mp3s.nashownotes.com/pc20rss.xml';
const PC20_PODCAST_GUID = '917393e3-1b1e-5cef-ace4-edaa54e1f810';
const PC20_IMAGE_URL = 'http://localhost:2111/e2e/images/e2e-embed-channel-art-1400.png';
/** Trimmed copy of the same feed on test-assets. The directory does not know this address. */
const PC20_ADD_BY_RSS_FEED_URL = 'http://localhost:2111/e2e/v4-carryover/podcasting20.xml';
/** Real audio for every carried file the pass adopts. */
const CARRIED_AUDIO_URL = 'http://localhost:2111/e2e/audio/e2e-podcast-short-60s-440hz.mp3';

/** No guid and an address without the op3 prefix, so only the seeded episode row answers it. */
const directoryMappedEpisode = {
  duration: 5995,
  id: 'v4Pc20Ep275',
  mediaType: 'audio/mpeg',
  mediaUrl: 'https://mp3s.nashownotes.com/PC20-275-2026-10-16-Final.mp3',
  pubDate: '2026-10-16T19:31:29.000Z',
  title: 'Episode 275: "Off The Rails"',
};

/** Answered by guid inside the mapped channel. */
const directoryGuidEpisode = {
  duration: 6065,
  guid: 'PC20-274',
  id: 'v4Pc20Ep274',
  mediaType: 'audio/mpeg',
  mediaUrl: 'https://op3.dev/e/mp3s.nashownotes.com/PC20-274-2026-10-09-Final.mp3',
  pubDate: '2026-10-09T19:37:54.000Z',
  title: 'Episode 274: "Vibe Cloning"',
};

/** v4 named Add by RSS files by the base64 of the enclosure URL. The feed copy lists this one. */
const addByRssListedEpisode = {
  addedByRSS: true,
  duration: 5335,
  guid: 'PC20-276',
  id: 'aHR0cHM6Ly9vcDMuZGV2L2UvbXAzcy5uYXNob3dub3Rlcy5jb20vUEMyMC0yNzYtMjAyNi0xMC0yMy1GaW5hbC5tcDM=',
  mediaType: 'audio/mpeg',
  mediaUrl: 'https://op3.dev/e/mp3s.nashownotes.com/PC20-276-2026-10-23-Final.mp3',
  pubDate: '2026-10-23T19:17:46.000Z',
  title: 'Episode 276: "Jackleg leechers"',
};

/** The feed copy does not list this one, so it stays a local episode on that feed. */
const addByRssLocalEpisode = {
  addedByRSS: true,
  duration: 5385,
  guid: 'PC20-273',
  id: 'aHR0cHM6Ly9vcDMuZGV2L2UvbXAzcy5uYXNob3dub3Rlcy5jb20vUEMyMC0yNzMtMjAyNi0xMC0wMi1GaW5hbC5tcDM=',
  mediaType: 'audio/mpeg',
  mediaUrl: 'https://op3.dev/e/mp3s.nashownotes.com/PC20-273-2026-10-02-Final.mp3',
  pubDate: '2026-10-02T19:18:08.000Z',
  title: 'Episode 273: "Advertising is the Horse and Buggies of Podcasting"',
};

const blockedEpisode = {
  guid: 'e2e-v4-blocked-episode-1',
  id: 'v4E2eBlkEp1',
  mediaType: 'audio/mpeg',
  mediaUrl: 'https://e2e-v4-blocked.example/episode-1.mp3',
  title: 'E2E V4 Blocked Episode',
};

const unfinishedEpisode = {
  guid: 'PC20-272',
  id: 'v4Pc20Ep272',
  mediaType: 'audio/mpeg',
  mediaUrl: 'https://op3.dev/e/mp3s.nashownotes.com/PC20-272-2026-09-25-Final.mp3',
  title: "Episode 272: \"Is this Y'all?\"",
};

/** Downloaded first; the other adopted files are copies of it. */
const AUDIO_SOURCE_NAME = `${directoryMappedEpisode.id}.mp3`;
const AUDIO_COPY_NAMES = [
  `${directoryGuidEpisode.id}.mp3`,
  `${addByRssListedEpisode.id}.mp3`,
  `${addByRssLocalEpisode.id}.mp3`,
];
/** Files the pass deletes. Their bytes are never read. No v4 list names the orphan. */
const PLACEHOLDER_NAMES = [
  `${blockedEpisode.id}.mp3`,
  `${unfinishedEpisode.id}.mp3`,
  'v4E2eOrphan1.mp3',
];

/** The seven names written at the document root, in the order `plantFixtureFiles` writes them. */
export const v4DownloadFixturePlantedNames = (): readonly string[] => [
  AUDIO_SOURCE_NAME,
  ...AUDIO_COPY_NAMES,
  ...PLACEHOLDER_NAMES,
];

const downloadFixturePairs = (): [string, string][] => {
  const pc20Podcast = {
    feedUrls: [{ url: PC20_FEED_URL }],
    id: PC20_PODCAST_ID,
    imageUrl: PC20_IMAGE_URL,
    podcastGuid: PC20_PODCAST_GUID,
    podcastIndexId: 920666,
    title: PC20_TITLE,
  };
  const downloadedPodcasts = [
    { ...pc20Podcast, episodes: [directoryMappedEpisode, directoryGuidEpisode] },
    {
      episodes: [blockedEpisode],
      feedUrls: [{ url: V4_E2E_BLOCKED_CACHED_FEED_URL }],
      id: V4_E2E_BLOCKED_PODCAST_ID,
      title: V4_E2E_BLOCKED_TITLE,
    },
    {
      addByRSSPodcastFeedUrl: PC20_ADD_BY_RSS_FEED_URL,
      episodes: [addByRssListedEpisode, addByRssLocalEpisode],
      id: PC20_ADD_BY_RSS_FEED_URL,
      imageUrl: PC20_IMAGE_URL,
      title: PC20_TITLE,
    },
  ];
  const downloadingEpisodes = [{ ...unfinishedEpisode, podcast: pc20Podcast }];
  return [
    [V4_DOWNLOAD_STATE_KEYS.downloadedPodcasts, JSON.stringify(downloadedPodcasts)],
    [V4_DOWNLOAD_STATE_KEYS.downloadingEpisodes, JSON.stringify(downloadingEpisodes)],
  ];
};

const plantFixtureFiles = async (): Promise<void> => {
  const root = FileSystem.documentDirectory;
  if (root === null) {
    throw new Error('No document directory');
  }
  for (const name of [AUDIO_SOURCE_NAME, ...AUDIO_COPY_NAMES, ...PLACEHOLDER_NAMES]) {
    await FileSystem.deleteAsync(`${root}${name}`, { idempotent: true });
  }
  const download = await FileSystem.downloadAsync(
    resolveE2eMediaUrl(CARRIED_AUDIO_URL),
    `${root}${AUDIO_SOURCE_NAME}`
  );
  if (download.status !== 200) {
    throw new Error('Fixture audio download failed');
  }
  for (const name of AUDIO_COPY_NAMES) {
    await FileSystem.copyAsync({ from: `${root}${AUDIO_SOURCE_NAME}`, to: `${root}${name}` });
  }
  for (const name of PLACEHOLDER_NAMES) {
    await FileSystem.writeAsStringAsync(`${root}${name}`, 'v4 e2e fixture');
  }
  beginV4DownloadFixtureFilesCheck(v4DownloadFixturePlantedNames());
};

/** True for this app's `e2e/v4-download-fixture` link while a dev E2E build is running. */
export const isV4DownloadE2eFixtureUrl = (url: string): boolean => {
  if (!__DEV__ || !getMobileConfig().isE2e) {
    return false;
  }
  return appPath(url) === DOWNLOAD_FIXTURE_PATH;
};

/**
 * Plants v4 download lists and files in `documentDirectory`, then reads them once.
 *
 * Dev E2E builds only. The files go down before the reset, inside the same carryover turn, so the
 * read that follows lists the orphan and finds every file the lists name.
 */
export const runV4DownloadE2eFixture = async (): Promise<void> => {
  if (!__DEV__ || !getMobileConfig().isE2e) {
    return;
  }
  try {
    await enqueueV4CarryoverWork(async () => {
      await plantFixtureFiles();
      await AsyncStorage.multiSet(downloadFixturePairs());
      await AsyncStorage.removeItem(V4_DOWNLOAD_STATE_KEYS.sharedFolder);
      await v4DownloadCarryoverRepository.clearRead();
    });
    await runV4CarryoverReadOnce();
  } catch {
    console.warn('[v4-carryover] download fixture read failed');
  }
};
```

Notes:

- The subscription read inside `runV4CarryoverReadOnce` already finished at launch, so it does
  nothing here; only plan 21's `performV4DownloadRead` stages rows. Staging calls
  `notifyV4CarryoverRowsSaved`, which schedules plan 42's job.
- No URL, file key, or folder is logged. The marker below is the only place a planted name is
  shown, and only while that name is still at the document root, on a dev E2E build.
- Do not add a unit test. The module is Expo file and storage glue that only a device build runs
  (**mobile-test-economics**). The remainder label is a join of names the device just stat'd;
  the flow is what proves those names are gone.

## 2. Wiring — `apps/mobile/App.tsx`

Line 31: import `isV4DownloadE2eFixtureUrl` and `runV4DownloadE2eFixture` beside the existing
two names from `./src/migration/v4/e2eFixture`.

In `rememberDeepLink` (around line 123), after the existing fixture branch:

```ts
      if (isV4E2eFixtureUrl(url)) {
        void runV4E2eFixture();
      }
      if (isV4DownloadE2eFixtureUrl(url)) {
        void runV4DownloadE2eFixture();
      }
```

## 2a. Planted-file marker

Maestro cannot read the app sandbox. A dev-E2E marker lists which planted names are still at
the document root. The flow asserts the text `none`.

### `apps/mobile/src/migration/v4/v4DownloadFixtureFilesMarker.ts` (new)

No React import. Write this module. `beginV4DownloadFixtureFilesCheck` runs only from
`plantFixtureFiles`, after the seven writes succeed. Other E2E flows never call it, so they
do no file stats.

```ts
import * as FileSystem from 'expo-file-system/legacy';

import { getMobileConfig } from '../../config';

const CHECK_INTERVAL_MS = 500;

let generation = 0;
let markerText = 'waiting';
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

export const v4DownloadFixtureRemainderLabel = (stillPresent: readonly string[]): string =>
  stillPresent.length === 0 ? 'none' : stillPresent.join(',');

export const getV4DownloadFixtureFilesMarker = (): string => markerText;

export const subscribeV4DownloadFixtureFilesMarker = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const publish = (next: string): void => {
  if (next === markerText) {
    return;
  }
  markerText = next;
  for (const listener of listeners) {
    listener();
  }
};

const stop = (): void => {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
};

export const beginV4DownloadFixtureFilesCheck = (names: readonly string[]): void => {
  if (!__DEV__ || !getMobileConfig().isE2e) {
    return;
  }
  generation += 1;
  const generationThisRun = generation;
  stop();
  let tickInFlight = false;

  const tick = async (): Promise<void> => {
    if (generation !== generationThisRun || tickInFlight) {
      return;
    }
    tickInFlight = true;
    try {
      const root = FileSystem.documentDirectory;
      if (root === null) {
        return;
      }
      const stillPresent: string[] = [];
      for (const name of names) {
        if (generation !== generationThisRun) {
          return;
        }
        const info = await FileSystem.getInfoAsync(`${root}${name}`);
        if (info.exists) {
          stillPresent.push(name);
        }
      }
      if (generation !== generationThisRun) {
        return;
      }
      const label = v4DownloadFixtureRemainderLabel(stillPresent);
      publish(label);
      if (label === 'none') {
        stop();
      }
    } catch {
      return;
    } finally {
      tickInFlight = false;
    }
  };

  void tick();
  timer = setInterval(() => {
    void tick();
  }, CHECK_INTERVAL_MS);
};
```

Rules the module already follows. Do not add a second path.

- Stats run only at `documentDirectory` plus the planted name. Do not read `downloads/`, the
  cache, or any other folder. Do not log a name or a path.
- A thrown stat, or a null document directory, leaves the previous text. Absence is
  `exists === false` only.
- One tick runs at a time. A tick from an older `beginV4DownloadFixtureFilesCheck` returns
  without publishing, so a late stat cannot put a name back after `none`.
- The interval starts only after this fixture plants files, and it stops once every planted
  name is gone. It is not a product timer and it does not run on launch.

### `apps/mobile/src/migration/v4/V4DownloadFixtureFilesMarker.tsx` (new)

Same 1×1 host as `PlaybackE2eStatus` (`pointerEvents="none"`, `height`/`width`/`left`/`top` 1,
`position: 'absolute'`, `overflow: 'hidden'`, marker `Text` also 1×1, `numberOfLines={1}`).

- Import `isMobileE2eFromEnv` from `../../config/env`.
- Return null unless `__DEV__` and `isMobileE2eFromEnv()`.
- `useSyncExternalStore(subscribeV4DownloadFixtureFilesMarker, getV4DownloadFixtureFilesMarker)`.
- One `Text`, `testID="v4-download-fixture-files-e2e"`, children are the store text
  (`waiting`, `none`, or the comma-joined names still at the root).
- No catalog string. The node is a harness token, the same kind as `playback-source-e2e`.

### Mount — `apps/mobile/src/navigation/index.tsx`

This file is large. Do not read it through. Grep the two anchors and edit only those lines.

- Import `V4DownloadFixtureFilesMarker` beside the `PlaybackE2eStatus` import (line 54).
- Render `<V4DownloadFixtureFilesMarker />` immediately after `<NotificationStreamE2eStatus />`
  (line 2565), still inside the same `View`, before `<PerfE2eReport />`.

## 3. Maestro flow — `apps/mobile/e2e/v4-download-carryover.yaml` (new)

Signed out, one platform at a time. Write exactly:

```yaml
appId: com.podverse.app.next
name: V4 Download Carryover
---
# A signed-out phone carries the previous app's downloads of the Podcasting 2.0 feed.
# The fixture link plants v4 download lists and files: two directory episodes, two episodes of an
# Add by RSS copy of the feed (one the copy no longer lists), and three files that cannot migrate
# (a blocked show, an unfinished download, and a file no list names).
# Directory files become downloads of seeded items. Add by RSS files land on that feed; the one
# the feed does not list stays a local episode, plays from its file, and leaves the feed when
# deleted. The error log counts each outcome. A root marker reads none once every planted name
# is gone from the document root.
# Needs Mobile E2E API (:4230) for the legacy episode lookup and test-assets (:2111) for the file
# bytes and the feed copy (registered in scripts/mobile/e2e-test.sh).

- runFlow: shared/launch-and-connect.yaml

- openLink: podverse-next://e2e/v4-download-fixture

- runFlow: shared/confirm-ios-open-dialog.yaml

# Directory outcome: both files are finished downloads of the seeded Podcasting 2.0 items.
- tapOn:
    id: tab-my-library
- assertVisible:
    id: library-hub-screen
- tapOn:
    id: library-nav-downloads
- extendedWaitUntil:
    visible:
      id: download-row-e2ePc20Ep275
    timeout: ${TIMEOUT_SLOWEST}
- assertVisible:
    id: download-row-channel-e2ePc20Ep275
    text: "Podcasting 2.0"
- assertVisible:
    id: download-row-e2ePc20Ep274

# Add by RSS outcome: both files are listed under the feed copy's address.
- scrollUntilVisible:
    element:
      id: "download-row-http.*::PC20-276"
    direction: DOWN
    timeout: ${TIMEOUT_SLOW}
- scrollUntilVisible:
    element:
      id: "download-row-http.*::PC20-273"
    direction: DOWN
    timeout: ${TIMEOUT_SLOW}
- takeScreenshot: v4-download-carryover-library-downloads

# The Add by RSS feed lists the copy's three episodes and the local episode the copy dropped.
# 274 appears only after the device parses the copy.
- tapOn:
    id: tab-my-library
- assertVisible:
    id: library-hub-screen
- tapOn:
    id: library-nav-add-by-rss
- assertVisible:
    id: rss-root-screen
- extendedWaitUntil:
    visible:
      text: "Podcasting 2.0"
    timeout: ${TIMEOUT_SLOW}
- tapOn:
    text: "Podcasting 2.0"
- assertVisible:
    id: add-by-rss-home-detail-screen
- extendedWaitUntil:
    visible:
      id: "home-feed-row-title-.*"
      text: 'Episode 274: "Vibe Cloning"'
    timeout: ${TIMEOUT_SLOWEST}
- assertVisible:
    id: "home-feed-row-title-.*"
    text: 'Episode 276: "Jackleg leechers"'
- scrollUntilVisible:
    element:
      id: "home-feed-row-title-.*"
      text: 'Episode 273: "Advertising is the Horse and Buggies of Podcasting"'
    direction: DOWN
    timeout: ${TIMEOUT_SLOW}
- takeScreenshot: v4-download-carryover-add-by-rss-feed

# The local episode plays from its carried file.
- tapOn:
    id: "home-feed-row-title-.*"
    text: 'Episode 273: "Advertising is the Horse and Buggies of Podcasting"'
- extendedWaitUntil:
    visible:
      id: add-by-rss-episode-detail-screen
    timeout: ${TIMEOUT_SLOW}
- tapOn:
    id: "home-row-play-.*"
- extendedWaitUntil:
    visible:
      id: playback-source-e2e
      text: local
    timeout: ${TIMEOUT_SLOW}
- extendedWaitUntil:
    visible:
      id: playback-active-e2e
      text: playing
    timeout: ${TIMEOUT_SLOW}
- takeScreenshot: v4-download-carryover-local-episode-playing

# A directory episode plays from its carried file. Playing it first also moves the player off the
# local episode before that file is deleted.
- tapOn:
    id: tab-my-library
- assertVisible:
    id: library-hub-screen
- tapOn:
    id: library-nav-downloads
- assertVisible:
    id: library-downloads-screen
- tapOn:
    id: download-row-e2ePc20Ep275
- extendedWaitUntil:
    visible:
      id: episode-detail-screen
    timeout: ${TIMEOUT_SLOW}
- tapOn:
    id: "home-row-play-.*"
- extendedWaitUntil:
    visible:
      id: playback-source-e2e
      text: local
    timeout: ${TIMEOUT_SLOW}
- extendedWaitUntil:
    visible:
      id: playback-active-e2e
      text: playing
    timeout: ${TIMEOUT_SLOW}
- takeScreenshot: v4-download-carryover-directory-playing
- runFlow: shared/stack-back.yaml

# Deleting the local episode's download removes it from Downloads and from the feed.
- assertVisible:
    id: library-downloads-screen
- scrollUntilVisible:
    element:
      id: "download-row-http.*::PC20-273"
    direction: DOWN
    timeout: ${TIMEOUT_SLOW}
- swipe:
    from:
      id: "download-row-http.*::PC20-273"
    direction: LEFT
- extendedWaitUntil:
    visible:
      id: "download-row-http.*::PC20-273-remove"
    timeout: ${TIMEOUT_FASTEST}
- tapOn:
    id: "download-row-http.*::PC20-273-remove"
- extendedWaitUntil:
    notVisible:
      id: "download-row-http.*::PC20-273"
    timeout: ${TIMEOUT_FAST}
- tapOn:
    id: tab-my-library
- assertVisible:
    id: library-hub-screen
- tapOn:
    id: library-nav-add-by-rss
- tapOn:
    text: "Podcasting 2.0"
- assertVisible:
    id: add-by-rss-home-detail-screen
- scrollUntilVisible:
    element:
      id: "home-feed-row-title-.*"
      text: 'Episode 274: "Vibe Cloning"'
    direction: DOWN
    timeout: ${TIMEOUT_SLOW}
- extendedWaitUntil:
    notVisible:
      id: "home-feed-row-title-.*"
      text: 'Episode 273: "Advertising is the Horse and Buggies of Podcasting"'
    timeout: ${TIMEOUT_FAST}
- takeScreenshot: v4-download-carryover-local-episode-deleted

# Deleted outcome and counts: one error-log entry for the pass.
# More is two pages on phone; iOS XCUITest omits off-screen testIDs until this row is scrolled in.
- tapOn:
    id: tab-more
- assertVisible:
    id: more-screen
- scrollUntilVisible:
    element:
      id: more-nav-advanced
    direction: DOWN
    timeout: ${TIMEOUT_FAST}
- tapOn:
    id: more-nav-advanced
- assertVisible:
    id: more-advanced-screen
- tapOn:
    id: more-advanced-error-log
- assertVisible:
    id: error-log-screen
- tapOn:
    id: "error-log-row-[0-9]+"
    text: "Moving Your Downloads.*"
    index: 0
- assertVisible:
    id: error-log-detail-screen
- assertVisible: ".*v4_download_carryover_done.*"
# Each field is one accessible element named "<label>: <value>".
- scrollUntilVisible:
    element:
      id: error-log-detail-field-directory_episodes
    direction: DOWN
    timeout: ${TIMEOUT_FAST}
- assertVisible:
    id: error-log-detail-field-directory_episodes
    text: "Directory Episodes: 2"
- scrollUntilVisible:
    element:
      id: error-log-detail-field-add_by_rss_episodes
    direction: DOWN
    timeout: ${TIMEOUT_FAST}
- assertVisible:
    id: error-log-detail-field-add_by_rss_episodes
    text: "Add by RSS Episodes: 2"
- scrollUntilVisible:
    element:
      id: error-log-detail-field-already_downloaded
    direction: DOWN
    timeout: ${TIMEOUT_FAST}
- assertVisible:
    id: error-log-detail-field-already_downloaded
    text: "Already Downloaded: 0"
- scrollUntilVisible:
    element:
      id: error-log-detail-field-deleted_files
    direction: DOWN
    timeout: ${TIMEOUT_FAST}
- assertVisible:
    id: error-log-detail-field-deleted_files
    text: "Files Deleted: 3"
- scrollUntilVisible:
    element:
      id: error-log-detail-field-missing_files
    direction: DOWN
    timeout: ${TIMEOUT_FAST}
- assertVisible:
    id: error-log-detail-field-missing_files
    text: "Files Not Found: 0"
- scrollUntilVisible:
    element:
      id: error-log-detail-field-unreadable_files
    direction: DOWN
    timeout: ${TIMEOUT_FAST}
- assertVisible:
    id: error-log-detail-field-unreadable_files
    text: "Files in an Unreadable Folder: 0"
- scrollUntilVisible:
    element:
      id: error-log-detail-field-undeletable_files
    direction: DOWN
    timeout: ${TIMEOUT_FAST}
- assertVisible:
    id: error-log-detail-field-undeletable_files
    text: "Files Not Deleted: 0"
- scrollUntilVisible:
    element:
      id: error-log-detail-field-waiting_files
    direction: DOWN
    timeout: ${TIMEOUT_FAST}
- assertVisible:
    id: error-log-detail-field-waiting_files
    text: "Files Waiting: 0"
# The log row above is written when the pass finishes. The marker lists planted names still at
# the document root; none means all seven are gone. The wait covers one stat after that write.
- extendedWaitUntil:
    visible:
      id: v4-download-fixture-files-e2e
      text: "none"
    timeout: ${TIMEOUT_SLOWEST}
- takeScreenshot: v4-download-carryover-error-log
```

Selector facts the flow relies on (all in the current tree or in this set's plans):

- `download-row-<itemIdText>`, `download-row-channel-<itemIdText>`, and the swipe control's
  `-remove` suffix: `LibraryDownloadsScreen.tsx` and `SwipeActionRow.tsx`. An Add by RSS
  download's id is `<feed URL>::<guid>` (plan 30). The `download-row-http.*` prefix keeps the
  regex off `download-row-channel-…`, `download-row-status-…`, and `download-row-date-…`.
- A complete row opens `EpisodeDetail` (`handleRowPress`). The episode page's play control is
  `home-row-play-<id>`, as in `library-downloads.yaml`.
- An Add by RSS episode row's title is `home-feed-row-title-<id>` (`HomeFeedRow.tsx`). The row
  opens `AddByRssEpisodeDetail` (`add-by-rss-episode-detail-screen`), whose play control is
  `home-row-play-<id>` (`add-by-rss-episode-sections.yaml`).
- The error-log row's accessible name starts with the job label, "Moving Your Downloads" (plan
  40), and is followed by the outcome, the time, and the code. A detail field's accessible name
  is `<label>: <value>` (`MoreErrorLogDetailScreen.tsx`), and every count is written, zeros
  included (plan 41's `v4DownloadCarryoverLogDetails`).
- `v4-download-fixture-files-e2e` is the 1×1 marker on the root navigator, so it stays in the
  tree on the error-log screen. Its text is `waiting` until the first stat, then `none` or the
  planted names still at the document root, comma-joined with no spaces. The flow accepts only
  `none`.
- Tapping the focused My Library tab returns to the Library hub.

## 4. Registration — `scripts/mobile/e2e-test.sh`

- `flow_needs_e2e_api`: add `v4-download-carryover` right after `v4-carryover-anonymous` on the
  line that ends `| v4-carryover-anonymous | v4v | \`.
- `flow_needs_test_assets`: add `v4-download-carryover` between `tablet` and `v4v`
  (`… | tablet | v4-download-carryover | v4v | video-transition)`).

## 5. Run lists

- `apps/mobile/e2e/HOW-TO-RUN.md`: add the flow directly after each `v4-carryover-anonymous`
  line in the three lists (around lines 292, 368, and 499):
  `npm run mobile:e2e:test -- --platform ios v4-download-carryover`,
  `npm run mobile:e2e:test -- --platform android v4-download-carryover`, and
  `npm run mobile:e2e:test -- v4-download-carryover`.
- `docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md`: add
  `npm run mobile:e2e:test -- v4-download-carryover` directly after the
  `v4-carryover-anonymous` line (around line 230).

## Self-check (no tests run)

- `npm run type-check:mobile` is the operator's; the agent checks only that the new code has no
  `any`, no `as`, and only `===`/`!==`.
- The flow parses as YAML, and every `text:` with a double quote inside is single-quoted.
- `bash -n scripts/mobile/e2e-test.sh` passes.

## Tests

- New Maestro flow `apps/mobile/e2e/v4-download-carryover.yaml`, registered for the E2E API and
  test-assets. It proves the directory outcome (two rows in Library → Downloads, one plays from
  its file), the Add by RSS outcome (both files on the feed; the one the feed copy does not list
  stays as a local episode, plays from its file, and leaves the feed when its download is
  deleted), and the deleted outcome with every count in the error log. It also asserts
  `v4-download-fixture-files-e2e` is `none`, so the seven planted names are gone from the
  document root, not only counted.
- The device needs a native rebuild before this flow, because plan 20 adds the Android native
  module `podverse-legacy-storage` and the set adds SQLite migrations. It also needs a fresh
  `make mobile_e2e_seed` after plan 50.
- `v4-carryover-anonymous.yaml` is unchanged and must still pass. Its fixture link and constants
  are untouched.
- No unit test for the fixture (§ 1 notes).

## Release scratchpad

none
