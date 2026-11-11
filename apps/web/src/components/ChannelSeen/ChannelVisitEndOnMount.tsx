'use client';

import { useEffect } from 'react';

import { endChannelVisit } from '../../lib/channelVisit/channelVisitStore';

/**
 * Ends the active channel visit when this page mounts.
 *
 * Mount on surfaces outside a channel or item detail (subscription list, home, search) so a later
 * return to the channel remount-marks and shows no leftover dots.
 */
export function ChannelVisitEndOnMount() {
  useEffect(() => {
    endChannelVisit();
  }, []);

  return null;
}
