import { splitFeedUrlUserinfo } from '@podverse/helpers';
import {
  getNonEmptyTrimmedStringProperty,
  getOwnPropertyValue,
  isPlainObject,
  toNonEmptyTrimmedString,
} from '@podverse/helpers/guards';
import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation/client';

/**
 * One signed-out subscription from the previous app, before it is resolved.
 *
 * `legacyId` is the podcast id, or the canonical Add by RSS address. A feed address is stored
 * without userinfo. Passwords are not part of this value.
 */
export type V4StagedEntry = {
  legacyKind: 'podcast' | 'add_by_rss';
  legacyId: string;
  cachedFeedUrl: string | null;
  cachedTitle: string | null;
};

export type V4StagedLegacyKind = V4StagedEntry['legacyKind'];

/** The four AsyncStorage strings. Each is JSON, or null when the key is absent. */
export type V4LocalStateRaw = {
  subscribedPodcastIds: string | null;
  subscribedPodcasts: string | null;
  addByRssFeedUrls: string | null;
  addByRssPodcasts: string | null;
};

const readJson = (raw: string | null): unknown => {
  if (raw === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
};

const readArray = (raw: string | null): unknown[] => {
  const parsed = readJson(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.slice();
};

const httpUrlWithoutUserinfo = (url: string): string | null => {
  const split = splitFeedUrlUserinfo(url);
  let parsed: URL;
  try {
    parsed = new URL(split.feedUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }
  if (parsed.hostname.length === 0 || parsed.username.length > 0 || parsed.password.length > 0) {
    return null;
  }
  return split.feedUrl;
};

const readPodcastIds = (raw: string | null): string[] => {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of readArray(raw)) {
    const id = toNonEmptyTrimmedString(item);
    if (id === null || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
};

const readCachedFeedUrl = (item: Record<string, unknown>): string | null => {
  const feedUrls = getOwnPropertyValue(item, 'feedUrls');
  if (!Array.isArray(feedUrls)) {
    return null;
  }
  const first: unknown = feedUrls[0];
  if (!isPlainObject(first)) {
    return null;
  }
  const url = getNonEmptyTrimmedStringProperty(first, 'url');
  if (url === null) {
    return null;
  }
  return httpUrlWithoutUserinfo(url);
};

type PodcastCache = {
  feedUrl: string | null;
  title: string | null;
};

const readPodcastCache = (
  raw: string | null,
  allowedIds: ReadonlySet<string>
): Map<string, PodcastCache> => {
  const cache = new Map<string, PodcastCache>();
  for (const item of readArray(raw)) {
    if (!isPlainObject(item)) {
      continue;
    }
    const id = getNonEmptyTrimmedStringProperty(item, 'id');
    if (id === null || !allowedIds.has(id)) {
      continue;
    }
    const current = cache.get(id) ?? { feedUrl: null, title: null };
    if (current.title === null) {
      current.title = getNonEmptyTrimmedStringProperty(item, 'title');
    }
    if (current.feedUrl === null) {
      current.feedUrl = readCachedFeedUrl(item);
    }
    cache.set(id, current);
  }
  return cache;
};

const readAddByRssUrls = (raw: string | null): string[] => {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const item of readArray(raw)) {
    const value = toNonEmptyTrimmedString(item);
    if (value === null) {
      continue;
    }
    const canonical = canonicalAddByRSSFeedUrl(value);
    if (canonical === null || seen.has(canonical)) {
      continue;
    }
    seen.add(canonical);
    urls.push(canonical);
  }
  return urls;
};

const readAddByRssTitles = (
  raw: string | null,
  allowedUrls: ReadonlySet<string>
): Map<string, string> => {
  const titles = new Map<string, string>();
  for (const item of readArray(raw)) {
    if (!isPlainObject(item)) {
      continue;
    }
    const feedUrl = getNonEmptyTrimmedStringProperty(item, 'addByRSSPodcastFeedUrl');
    if (feedUrl === null) {
      continue;
    }
    const canonical = canonicalAddByRSSFeedUrl(feedUrl);
    if (canonical === null || !allowedUrls.has(canonical) || titles.has(canonical)) {
      continue;
    }
    const title = getNonEmptyTrimmedStringProperty(item, 'title');
    if (title === null) {
      continue;
    }
    titles.set(canonical, title);
  }
  return titles;
};

const parseEntries = (raw: V4LocalStateRaw): V4StagedEntry[] => {
  const podcastIds = readPodcastIds(raw.subscribedPodcastIds);
  const podcastCache = readPodcastCache(raw.subscribedPodcasts, new Set(podcastIds));
  const podcasts: V4StagedEntry[] = podcastIds.map((legacyId) => {
    const cache = podcastCache.get(legacyId);
    return {
      cachedFeedUrl: cache?.feedUrl ?? null,
      cachedTitle: cache?.title ?? null,
      legacyId,
      legacyKind: 'podcast',
    };
  });

  const feedUrls = readAddByRssUrls(raw.addByRssFeedUrls);
  const titles = readAddByRssTitles(raw.addByRssPodcasts, new Set(feedUrls));
  const addByRss: V4StagedEntry[] = feedUrls.map((legacyId) => ({
    cachedFeedUrl: null,
    cachedTitle: titles.get(legacyId) ?? null,
    legacyId,
    legacyKind: 'add_by_rss',
  }));

  return [...podcasts, ...addByRss];
};

/**
 * Reads the previous app's signed-out lists. A value that is not the expected JSON shape is an
 * empty list. This never throws.
 */
export const parseV4LocalState = (raw: V4LocalStateRaw): V4StagedEntry[] => {
  try {
    return parseEntries(raw);
  } catch {
    return [];
  }
};
