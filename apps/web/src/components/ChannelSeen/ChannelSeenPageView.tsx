'use client';

import { useEffect } from 'react';

import { useAccount } from '../../contexts/Account';
import { getApiRequestService } from '../../factories/apiRequestService';

interface ChannelSeenPageViewProps {
  channelIdText: string;
}

/**
 * Records that this account has opened this channel.
 *
 * Seen state belongs to the account rather than to a device, so every surface that can change it has
 * to write it. A website that only read it would leave a badge on the user's phone for a show they
 * listened to at their desk, and nothing would ever clear it.
 *
 * Renders nothing, and is keyed on the channel alone so switching tabs within the page does not
 * re-stamp it. A failed write is swallowed rather than surfaced: the timestamp only moves forward,
 * so the next visit records it and the user is never shown an error about a badge.
 */
export function ChannelSeenPageView({ channelIdText }: ChannelSeenPageViewProps) {
  const { loggedInAccount } = useAccount();

  useEffect(() => {
    if (!loggedInAccount || channelIdText === '') {
      return;
    }

    void getApiRequestService()
      .reqAccountChannelSeenMark({ entries: [{ channel_id_text: channelIdText }] })
      .catch(() => {});
  }, [channelIdText, loggedInAccount]);

  return null;
}
