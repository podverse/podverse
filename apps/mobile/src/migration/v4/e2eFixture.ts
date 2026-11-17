import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { getMobileConfig } from '../../config';
import { v4CarryoverRepository } from '../../data/repositories/v4CarryoverRepository';
import { v4DownloadCarryoverRepository } from '../../data/repositories/v4DownloadCarryoverRepository';
import { resolveE2eMediaUrl } from '../../lib/e2e/resolveE2eMediaUrl';
import { V4_DOWNLOAD_STATE_KEYS } from './readV4DownloadState';
import {
  enqueueV4CarryoverWork,
  runV4CarryoverReadOnce,
  V4_LOCAL_STATE_KEYS,
} from './readV4LocalState';
import { beginV4DownloadFixtureFilesCheck } from './v4DownloadFixtureFilesCheck';

/** v4 podcast id the lookup answers with a directory channel. */
export const V4_E2E_CHANNEL_PODCAST_ID = 'v4E2eChan01';

/** v4 podcast id the lookup answers with a feed address. */
export const V4_E2E_FEED_URL_PODCAST_ID = 'v4E2eFeed01';

/** v4 podcast id the lookup answers as blocked. */
export const V4_E2E_BLOCKED_PODCAST_ID = 'v4E2eBlkd01';

/** v4 podcast id the lookup does not know. The cached address is the only URL. */
export const V4_E2E_UNKNOWN_PODCAST_ID = 'v4E2eUnkn01';

export const V4_E2E_CHANNEL_CACHED_FEED_URL = 'https://e2e-v4-channel.example/feed.xml';
export const V4_E2E_FEED_URL_CACHED_FEED_URL = 'http://localhost:2111/feeds/feed-podcast-1.rss';
export const V4_E2E_BLOCKED_CACHED_FEED_URL = 'https://e2e-v4-blocked.example/feed.xml';
export const V4_E2E_UNKNOWN_CACHED_FEED_URL = 'https://e2e-v4-unknown.example/feed.xml';
export const V4_E2E_ADD_BY_RSS_FEED_URL = 'https://e2e-v4-add-by-rss.example/feed.xml';

export const V4_E2E_CHANNEL_TITLE = 'E2E V4 Directory Show';
export const V4_E2E_FEED_URL_TITLE = 'E2E V4 Feed URL Show';
export const V4_E2E_BLOCKED_TITLE = 'E2E V4 Blocked Show';
export const V4_E2E_UNKNOWN_TITLE = 'E2E V4 Unknown Show';
export const V4_E2E_ADD_BY_RSS_TITLE = 'E2E V4 Add by RSS';

const FIXTURE_PATH = '/e2e/v4-fixture';

const appPath = (url: string): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const scheme = parsed.protocol.endsWith(':') ? parsed.protocol.slice(0, -1) : parsed.protocol;
  if (!getMobileConfig().deepLinkSchemes.includes(scheme)) {
    return null;
  }
  const pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
  const combined = parsed.host.length > 0 ? `/${parsed.host}${pathname}` : pathname;
  const stripped = combined.replace(/\/+$/, '');
  return stripped.length > 0 ? stripped : '/';
};

/** True for this app's `e2e/v4-fixture` link while a dev E2E build is running. */
export const isV4E2eFixtureUrl = (url: string): boolean => {
  if (!__DEV__ || !getMobileConfig().isE2e) {
    return false;
  }
  return appPath(url) === FIXTURE_PATH;
};

const fixturePairs = (): [string, string][] => {
  const subscribedPodcasts = [
    {
      feedUrls: [{ url: V4_E2E_CHANNEL_CACHED_FEED_URL }],
      id: V4_E2E_CHANNEL_PODCAST_ID,
      title: V4_E2E_CHANNEL_TITLE,
    },
    {
      feedUrls: [{ url: V4_E2E_FEED_URL_CACHED_FEED_URL }],
      id: V4_E2E_FEED_URL_PODCAST_ID,
      title: V4_E2E_FEED_URL_TITLE,
    },
    {
      feedUrls: [{ url: V4_E2E_BLOCKED_CACHED_FEED_URL }],
      id: V4_E2E_BLOCKED_PODCAST_ID,
      title: V4_E2E_BLOCKED_TITLE,
    },
    {
      feedUrls: [{ url: V4_E2E_UNKNOWN_CACHED_FEED_URL }],
      id: V4_E2E_UNKNOWN_PODCAST_ID,
      title: V4_E2E_UNKNOWN_TITLE,
    },
  ];
  const addByRssPodcasts = [
    {
      addByRSSPodcastFeedUrl: V4_E2E_ADD_BY_RSS_FEED_URL,
      title: V4_E2E_ADD_BY_RSS_TITLE,
    },
  ];
  return [
    [
      V4_LOCAL_STATE_KEYS.subscribedPodcastIds,
      JSON.stringify([
        V4_E2E_CHANNEL_PODCAST_ID,
        V4_E2E_FEED_URL_PODCAST_ID,
        V4_E2E_BLOCKED_PODCAST_ID,
        V4_E2E_UNKNOWN_PODCAST_ID,
      ]),
    ],
    [V4_LOCAL_STATE_KEYS.subscribedPodcasts, JSON.stringify(subscribedPodcasts)],
    [V4_LOCAL_STATE_KEYS.addByRssFeedUrls, JSON.stringify([V4_E2E_ADD_BY_RSS_FEED_URL])],
    [V4_LOCAL_STATE_KEYS.addByRssPodcasts, JSON.stringify(addByRssPodcasts)],
  ];
};

/**
 * Plants the four signed-out lists, then reads them once.
 *
 * Dev E2E builds only. The launch read and this reset take turns, so a read that started with
 * empty storage cannot record itself finished after the fixture has cleared that flag.
 */
export const runV4E2eFixture = async (): Promise<void> => {
  if (!__DEV__ || !getMobileConfig().isE2e) {
    return;
  }
  try {
    await enqueueV4CarryoverWork(async () => {
      await AsyncStorage.multiSet(fixturePairs());
      await v4CarryoverRepository.clearRead();
    });
    await runV4CarryoverReadOnce();
  } catch {
    console.warn('[v4-carryover] fixture read failed');
  }
};

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
  title: 'Episode 272: "Is this Y\'all?"',
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
