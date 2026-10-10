import { useCallback } from 'react';

import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';

import { toAddByRssItemPlaybackResourceData } from '../lib/addByRss/domain';
import { usePlaybackSession } from '../playback/PlaybackProvider';
import type { MobileAddByRSSFeedRecord } from '../prefs/addByRSSFeeds';

type UseAddByRssPlaybackOptions = {
  onNotice: (messageKey: string | null) => void;
};

/**
 * Plays a device-local add-by-RSS episode through the shared player, so the mini player, queue
 * advance, and car surfaces all describe the episode that is actually playing. Loading the native
 * engine from a screen would leave whatever the provider last loaded (for example the queue head
 * adopted at sign-in) as the now-playing item, and its `ended` event would finish that item instead.
 */
export function useAddByRssPlayback({ onNotice }: UseAddByRssPlaybackOptions) {
  const { playAddByRssResourceData } = usePlaybackSession();

  const playItem = useCallback(
    async (
      feed: MobileAddByRSSFeedRecord,
      mappedFeed: AddByRSSMappedFeed,
      itemBundle: AddByRSSMappedFeed['items'][number],
      itemIndex: number
    ) => {
      const enclosureUrl = itemBundle.enclosures[0]?.item_enclosure_sources[0]?.uri ?? null;
      if (enclosureUrl === null) {
        onNotice('features.add_by_rss.status_processing');
        return;
      }

      onNotice(null);
      await playAddByRssResourceData(
        toAddByRssItemPlaybackResourceData(feed, mappedFeed, itemBundle, itemIndex)
      );
    },
    [onNotice, playAddByRssResourceData]
  );

  return { playItem };
}
