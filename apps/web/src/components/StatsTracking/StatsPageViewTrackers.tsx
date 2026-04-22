'use client';

import { useEffect } from 'react';

import { useAccount } from '../../contexts/Account';
import { trackStatsPlaylist } from '../../utils/statsTracking/statsTracking';

export function StatsPlaylistPageView(props: { playlistIdText: string }) {
  const { loggedInAccount } = useAccount();

  useEffect(() => {
    if (!loggedInAccount) {
      return;
    }
    trackStatsPlaylist(props.playlistIdText);
  }, [loggedInAccount, props.playlistIdText]);

  return null;
}
