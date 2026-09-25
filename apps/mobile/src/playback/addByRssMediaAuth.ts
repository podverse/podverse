import { Platform } from 'react-native';

import { toNonEmptyTrimmedString } from '@podverse/helpers/guards';
import type { PlaybackTarget } from '@podverse/playback-core';

import type { MediaEngineSource } from '../../modules/podverse-media-engine';
import { isAddByRssInsecureCredentialsAllowedFromEnv } from '../config/env';
import { addByRssCredentialStore } from '../data/repositories/addByRssCredentialStore';
import { addByRssRepository } from '../data/repositories/addByRssRepository';
import type {
  AddByRssHeaderAuthDecision,
  AddByRssMediaCredentialsState,
} from '../lib/addByRss/mediaAuth';
import { decideAddByRssHeaderAuth, decideAddByRssPlaybackAuth } from '../lib/addByRss/mediaAuth';
import { resolveE2eMediaUrl } from '../lib/e2e/resolveE2eMediaUrl';

/**
 * Device-held add-by-RSS credentials applied to media requests.
 *
 * Credentials come from SecureStore at request time and are never logged; only the resulting
 * {@link AddByRssMediaCredentialsState} is kept, so a playback error row can say whether they
 * were sent or why not.
 */

const isRemoteHttpUrl = (url: string): boolean => /^https?:\/\//i.test(url.trim());

/**
 * Feed URL of an add-by-RSS target: `feed_url` when the device built the resource data, otherwise
 * the local feed whose `idText` is the item's `channel_id_text`.
 */
export const addByRssFeedUrlForTarget = async (
  target: PlaybackTarget | null
): Promise<string | null> => {
  if (target === null || target.kind !== 'add-by-rss') {
    return null;
  }
  const data = target.resourceData;
  const feedUrl = toNonEmptyTrimmedString(data.feed_url);
  if (feedUrl !== null) {
    return feedUrl;
  }
  const channelIdText = toNonEmptyTrimmedString(data.channel_id_text);
  if (channelIdText === null) {
    return null;
  }
  if (isRemoteHttpUrl(channelIdText)) {
    return channelIdText;
  }
  try {
    return (await addByRssRepository.getFeedByIdText(channelIdText))?.feedUrl ?? null;
  } catch {
    return null;
  }
};

const readCredentials = async (feedUrl: string) => {
  try {
    return await addByRssCredentialStore.getForCurrentAccount(feedUrl);
  } catch {
    return null;
  }
};

let lastPlaybackCredentials: { state: AddByRssMediaCredentialsState; url: string } | null = null;

/** Credential outcome of the most recent load, or `null` when it was not an add-by-RSS item. */
export const addByRssCredentialsStateForLastLoad = (): AddByRssMediaCredentialsState | null =>
  lastPlaybackCredentials?.state ?? null;

/** Credential outcome of the most recent load of `url`, or `null` when it carried none. */
export const addByRssCredentialsStateForUrl = (
  url: string | null
): AddByRssMediaCredentialsState | null => {
  if (url === null || lastPlaybackCredentials === null) {
    return null;
  }
  return lastPlaybackCredentials.url === url.trim() ? lastPlaybackCredentials.state : null;
};

/**
 * `source` plus engine `basicAuth` when `target` is a protected add-by-RSS item and the media URL
 * is on the feed's domain. Every other target passes through unchanged.
 */
export async function withAddByRssPlaybackAuth(
  target: PlaybackTarget | null,
  source: MediaEngineSource
): Promise<MediaEngineSource> {
  const feedUrl = await addByRssFeedUrlForTarget(target);
  if (feedUrl === null) {
    lastPlaybackCredentials = null;
    return source;
  }
  const credentials = isRemoteHttpUrl(source.url) ? await readCredentials(feedUrl) : null;
  const decision = decideAddByRssPlaybackAuth({
    allowInsecure: isAddByRssInsecureCredentialsAllowedFromEnv(),
    credentials,
    feedUrl: resolveE2eMediaUrl(feedUrl),
    mediaUrl: source.url,
  });
  lastPlaybackCredentials = { state: decision.state, url: source.url.trim() };
  return decision.basicAuth === null ? source : { ...source, basicAuth: decision.basicAuth };
}

/**
 * `Authorization` header for a download or artwork request against an add-by-RSS feed's host.
 * `feedUrl: null` (not an add-by-RSS item) yields no header.
 */
export async function addByRssRequestHeaderAuth(
  feedUrl: string | null,
  url: string
): Promise<AddByRssHeaderAuthDecision> {
  if (feedUrl === null) {
    return { headers: null, state: 'not_stored' };
  }
  const credentials = isRemoteHttpUrl(url) ? await readCredentials(feedUrl) : null;
  return decideAddByRssHeaderAuth({
    allowInsecure: isAddByRssInsecureCredentialsAllowedFromEnv(),
    credentials,
    feedUrl: resolveE2eMediaUrl(feedUrl),
    mediaUrl: url,
    platform: Platform.OS === 'android' ? 'android' : 'ios',
  });
}
