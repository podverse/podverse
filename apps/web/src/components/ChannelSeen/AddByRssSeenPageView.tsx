'use client';

import { useEffect } from 'react';

import { toEpochMsOrNull } from '@podverse/helpers';

import { useAccount } from '../../contexts/Account';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useChannelVisitActions } from '../../hooks/useChannelVisit';

interface AddByRssSeenPageViewProps {
  feedUrl: string;
}

/**
 * Records that this account has opened this add-by-RSS feed, and freezes the previous last-seen
 * for the visit so item rows can still show new-content dots.
 *
 * Clearing the timestamp here is also what clears that feed's badge on a phone after sync.
 */
export function AddByRssSeenPageView({ feedUrl }: AddByRssSeenPageViewProps) {
  const { loggedInAccount } = useAccount();
  const { beginVisit, hasActiveVisit } = useChannelVisitActions();

  useEffect(() => {
    if (!loggedInAccount || feedUrl === '') {
      return;
    }

    const key = { feedUrl, kind: 'add-by-rss' as const };
    if (hasActiveVisit(key)) {
      return;
    }

    let cancelled = false;

    void getApiRequestService()
      .reqAccountChannelSeenMarkAddByRss({ entries: [{ feed_url: feedUrl }] })
      .then((results) => {
        if (cancelled) {
          return;
        }
        const result = results[0];
        const previousMs =
          result === undefined ? null : toEpochMsOrNull(result.previous_last_seen_at);
        beginVisit(key, previousMs);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [beginVisit, feedUrl, hasActiveVisit, loggedInAccount]);

  return null;
}
