'use client';

import { useEffect } from 'react';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useChannelVisit, useChannelVisitActions } from '../../hooks/useChannelVisit';
import {
  channelVisitKeyMatchesChannel,
  channelVisitKeyMatchesFeedUrl,
} from '../../lib/channelVisit/channelVisitStore';

/**
 * When the player lands on an item belonging to the active channel visit, record that item as
 * engaged so its list-row dot clears even if play started from the detail page or by auto-advance.
 */
export function ChannelVisitEngagePlayback() {
  const visit = useChannelVisit();
  const { engageItem } = useChannelVisitActions();
  const { mpAddByRSS, mpChannel, mpItem } = useMediaPlayer();

  useEffect(() => {
    if (visit === null) {
      return;
    }

    if (mpItem !== null) {
      const channelIdText = mpChannel?.id_text ?? mpItem.channel?.id_text ?? null;
      const matchesDirectory =
        channelIdText !== null && channelVisitKeyMatchesChannel(visit.key, channelIdText);
      if (matchesDirectory) {
        engageItem(mpItem.id_text);
      }
      return;
    }

    if (mpAddByRSS === null) {
      return;
    }

    const feedUrlRaw = mpAddByRSS.resourceData['feed_url'];
    const feedUrl = typeof feedUrlRaw === 'string' ? feedUrlRaw : null;
    if (feedUrl !== null && channelVisitKeyMatchesFeedUrl(visit.key, feedUrl)) {
      engageItem(mpAddByRSS.idText);
    }
  }, [engageItem, mpAddByRSS, mpChannel, mpItem, visit]);

  return null;
}
