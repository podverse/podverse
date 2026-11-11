'use client';

import { useEffect } from 'react';

import { toEpochMsOrNull } from '@podverse/helpers';

import { useAccount } from '../../contexts/Account';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useChannelVisitActions } from '../../hooks/useChannelVisit';

interface ChannelSeenPageViewProps {
  channelIdText: string;
}

/**
 * Records that this account has opened this channel, and freezes the previous last-seen for the
 * visit so episode rows can still show new-content dots.
 *
 * Seen state belongs to the account rather than to a device, so every surface that can change it has
 * to write it. A website that only read it would leave a badge on the user's phone for a show they
 * listened to at their desk, and nothing would ever clear it.
 *
 * Renders nothing, and is keyed on the channel alone so switching tabs within the page does not
 * re-stamp it. Returning from an episode while the visit is still active skips the mark so engaged
 * ids stay. A failed write is swallowed rather than surfaced: the timestamp only moves forward,
 * so the next visit records it and the user is never shown an error about a badge.
 */
export function ChannelSeenPageView({ channelIdText }: ChannelSeenPageViewProps) {
  const { loggedInAccount } = useAccount();
  const { beginVisit, hasActiveVisit } = useChannelVisitActions();

  useEffect(() => {
    if (!loggedInAccount || channelIdText === '') {
      return;
    }

    const key = { channelIdText, kind: 'channel' as const };
    if (hasActiveVisit(key)) {
      return;
    }

    let cancelled = false;

    void getApiRequestService()
      .reqAccountChannelSeenMark({ entries: [{ channel_id_text: channelIdText }] })
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
  }, [beginVisit, channelIdText, hasActiveVisit, loggedInAccount]);

  return null;
}
