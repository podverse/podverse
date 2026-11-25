'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useAccount } from '../contexts/Account';
import { useConfig } from '../contexts/Config';
import { useMediaPlayer } from '../contexts/MediaPlayer';
import type { ArtistLineLink } from '../lib/artistPublishers';
import type { DeviceArtistLinksInput } from '../utils/addByRSS/deviceArtistLinks';
import { resolveDeviceArtistLinks } from '../utils/addByRSS/deviceArtistLinks';
import { onAddByRSSFeedChanged } from '../utils/addByRSS/feedChangedEvent';
import { withoutAddByRSSArtistLinks } from '../utils/addByRSS/publisherLinks';

const EMPTY_DEVICE_ARTIST_LINKS: readonly ArtistLineLink[] = [];

/** One in-flight read per playback key, shared by the bar and the full-size player. */
const deviceArtistLinkPromises = new Map<string, Promise<ArtistLineLink[]>>();

let feedChangeClearRegistered = false;

/** Drops cached reads when this browser's Add by RSS data changes, so the line can refresh. */
const ensureDeviceArtistLinkCacheClearsOnFeedChange = (): void => {
  if (feedChangeClearRegistered || typeof window === 'undefined') {
    return;
  }
  feedChangeClearRegistered = true;
  onAddByRSSFeedChanged(() => {
    deviceArtistLinkPromises.clear();
  });
};

const loadDeviceArtistLinks = (
  cacheKey: string,
  input: DeviceArtistLinksInput
): Promise<ArtistLineLink[]> => {
  const existing = deviceArtistLinkPromises.get(cacheKey);
  if (existing !== undefined) {
    return existing;
  }

  const pending = resolveDeviceArtistLinks(input).then(
    (links) => links,
    (error: unknown) => {
      console.error('Device artist links could not be read', error);
      if (deviceArtistLinkPromises.get(cacheKey) === pending) {
        deviceArtistLinkPromises.delete(cacheKey);
      }
      return [];
    }
  );
  deviceArtistLinkPromises.set(cacheKey, pending);
  return pending;
};

const playbackArtistLinksKey = (input: {
  loggedIn: boolean;
  addByRSS: DeviceArtistLinksInput['addByRSS'];
  channelIdText: string | null;
}): string | null => {
  if (!input.loggedIn) {
    return null;
  }
  if (input.addByRSS !== null) {
    return `rss:${input.addByRSS.feedUrl ?? input.addByRSS.channelIdText ?? ''}`;
  }
  if (input.channelIdText !== null) {
    return `dir:${input.channelIdText}`;
  }
  return null;
};

/** Device-only artist links for what is playing. Empty when logged out or nothing matches. */
export const useDeviceArtistLinks = (): readonly ArtistLineLink[] => {
  const { mpAddByRSS, mpChannel, mpItem } = useMediaPlayer();
  const { loggedInAccount } = useAccount();
  const addByRSSEnabled = useConfig().public.catalog.addByRSSEnabled;
  const feedUrl =
    typeof mpAddByRSS?.resourceData?.feed_url === 'string'
      ? mpAddByRSS.resourceData.feed_url
      : null;
  const channelIdText =
    typeof mpAddByRSS?.resourceData?.channel_id_text === 'string'
      ? mpAddByRSS.resourceData.channel_id_text
      : null;
  const addByRSS = mpAddByRSS === null ? null : { feedUrl, channelIdText };
  const key = playbackArtistLinksKey({
    loggedIn: loggedInAccount !== null,
    addByRSS,
    channelIdText: mpChannel === null ? null : mpChannel.id_text,
  });
  const inputRef = useRef<DeviceArtistLinksInput>({
    addByRSS: null,
    channel: null,
    item: null,
  });
  inputRef.current = {
    addByRSS,
    channel: mpChannel,
    item: mpItem,
  };

  const [links, setLinks] = useState<readonly ArtistLineLink[]>(EMPTY_DEVICE_ARTIST_LINKS);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    ensureDeviceArtistLinkCacheClearsOnFeedChange();
    return onAddByRSSFeedChanged(() => {
      setReloadKey((current) => current + 1);
    });
  }, []);

  useEffect(() => {
    if (key === null) {
      setLinks(EMPTY_DEVICE_ARTIST_LINKS);
      return;
    }

    setLinks(EMPTY_DEVICE_ARTIST_LINKS);
    let cancelled = false;
    const promise = loadDeviceArtistLinks(key, inputRef.current);
    void promise.then((result) => {
      if (!cancelled) {
        setLinks(result.length === 0 ? EMPTY_DEVICE_ARTIST_LINKS : result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [key, reloadKey]);

  const visible = useMemo(
    () => (addByRSSEnabled ? links : withoutAddByRSSArtistLinks(links)),
    [addByRSSEnabled, links]
  );
  return visible.length === 0 ? EMPTY_DEVICE_ARTIST_LINKS : visible;
};
