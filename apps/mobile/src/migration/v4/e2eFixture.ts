import AsyncStorage from '@react-native-async-storage/async-storage';

import { getMobileConfig } from '../../config';
import { v4CarryoverRepository } from '../../data/repositories/v4CarryoverRepository';
import {
  enqueueV4CarryoverWork,
  runV4CarryoverReadOnce,
  V4_LOCAL_STATE_KEYS,
} from './readV4LocalState';

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
