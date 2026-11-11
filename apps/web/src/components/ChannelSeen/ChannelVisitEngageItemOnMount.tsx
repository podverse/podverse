'use client';

import { useEffect } from 'react';

import { useChannelVisitActions } from '../../hooks/useChannelVisit';

type ChannelVisitEngageItemOnMountProps = {
  itemIdText: string;
};

/**
 * Records that the user opened this item's detail during an active channel visit, so that row's
 * unseen dot clears when they return to the channel list.
 */
export function ChannelVisitEngageItemOnMount({ itemIdText }: ChannelVisitEngageItemOnMountProps) {
  const { engageItem } = useChannelVisitActions();

  useEffect(() => {
    if (itemIdText === '') {
      return;
    }
    engageItem(itemIdText);
  }, [engageItem, itemIdText]);

  return null;
}
