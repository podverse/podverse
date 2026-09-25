import { useCallback, useState } from 'react';

import type { AddByRSSResourceData } from '@podverse/helpers';
import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';
import type { PlaybackTarget } from '@podverse/playback-core';
import { resolvePlaybackLoadDecision } from '@podverse/playback-core/resolvePlaybackLoadDecision';

import { useNativePlaybackBridge } from '../bridge';
import { isMobileE2eFromEnv } from '../config/env';
import { EMPTY_ABRIDGED_INDEX, toAddByRssItemPlaybackResourceData } from '../lib/addByRss/domain';
import { resolveE2eMediaUrl } from '../lib/e2e/resolveE2eMediaUrl';
import { withAddByRssPlaybackAuth } from '../playback/addByRssMediaAuth';
import type { MobileAddByRSSFeedRecord } from '../prefs/addByRSSFeeds';

type UseAddByRssPlaybackOptions = {
  onNotice: (messageKey: string | null) => void;
};

export function useAddByRssPlayback({ onNotice }: UseAddByRssPlaybackOptions) {
  const [isPlaybackActive, setIsPlaybackActive] = useState<boolean>(false);

  const bridge = useNativePlaybackBridge({
    playbackState: (event) => {
      if (!isMobileE2eFromEnv()) {
        return;
      }
      // Do not clear on paused/stalled — iOS emits those during load while the
      // subsequent `playing` event can be dropped under bridgeless.
      if (event.state === 'playing') {
        setIsPlaybackActive(true);
      } else if (event.state === 'error' || event.state === 'ended') {
        setIsPlaybackActive(false);
      }
    },
    error: () => {
      if (isMobileE2eFromEnv()) {
        setIsPlaybackActive(false);
      }
    },
  });

  const playResource = useCallback(
    async (resourceData: AddByRSSResourceData, mediaUrl: string) => {
      const target: PlaybackTarget = { kind: 'add-by-rss', resourceData };
      const decision = resolvePlaybackLoadDecision(
        { target },
        {
          abridged: EMPTY_ABRIDGED_INDEX,
        }
      );

      try {
        await bridge.load(
          await withAddByRssPlaybackAuth(target, {
            initialSeekSeconds: decision.initialSeekSeconds,
            url: mediaUrl,
          })
        );
        if (decision.shouldAutoPlay) {
          await bridge.play();
        }
        // E2E marker: native `playing` events are reliable on Android; on iOS
        // (bridgeless) they can arrive late or be missed while AVPlayer is already
        // playing. Assert load/play completed without throw instead.
        if (isMobileE2eFromEnv()) {
          setIsPlaybackActive(true);
        }
        onNotice('media_player.play');
      } catch {
        if (isMobileE2eFromEnv()) {
          setIsPlaybackActive(false);
        }
        onNotice('features.add_by_rss.status_processing');
      }
    },
    [bridge, onNotice]
  );

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

      await playResource(
        toAddByRssItemPlaybackResourceData(feed, mappedFeed, itemBundle, itemIndex),
        resolveE2eMediaUrl(enclosureUrl)
      );
    },
    [onNotice, playResource]
  );

  return {
    isPlaybackActive,
    playItem,
  };
}
