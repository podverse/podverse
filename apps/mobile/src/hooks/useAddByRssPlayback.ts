import { useCallback, useState } from 'react';

import { resolvePlaybackLoadDecision } from '@podverse/playback-core/resolvePlaybackLoadDecision';

import { useNativePlaybackBridge } from '../bridge';
import { isMobileE2eFromEnv } from '../config/env';
import { addByRssRepository } from '../data';
import { EMPTY_ABRIDGED_INDEX, toAddByRssPlaybackResourceData } from '../lib/addByRss/domain';
import { resolveE2eMediaUrl } from '../lib/e2e/resolveE2eMediaUrl';
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

  const playFeed = useCallback(
    async (feed: MobileAddByRSSFeedRecord) => {
      if (feed.enclosureUrl === null) {
        onNotice('features.add_by_rss.status_processing');
        return;
      }

      // Prefer the full mapped resource data (parser-mapping bundle persisted in SQLite);
      // fall back to the slim record when no bundle is available (offline / pre-mapping feeds).
      const mappedFeed = await addByRssRepository.getMappedFeedByUrl(feed.feedUrl);
      const resourceData = toAddByRssPlaybackResourceData(feed, mappedFeed);

      const decision = resolvePlaybackLoadDecision(
        {
          target: {
            kind: 'add-by-rss',
            resourceData,
          },
        },
        {
          abridged: EMPTY_ABRIDGED_INDEX,
        }
      );

      const mediaUrl = resolveE2eMediaUrl(feed.enclosureUrl);

      try {
        await bridge.load({
          initialSeekSeconds: decision.initialSeekSeconds,
          url: mediaUrl,
        });
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

  return {
    isPlaybackActive,
    playFeed,
  };
}
