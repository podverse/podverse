'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import type { ChipRowItem } from '@podverse/ui';

import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';

export type AddByRSSPodcastPageTabKey =
  'episodes' | 'boosts' | 'about' | 'podroll' | 'remote_items' | 'settings';

type AddByRSSPodcastPageListHeaderProps = {
  selectedKey: AddByRSSPodcastPageTabKey;
  onSelect: (key: AddByRSSPodcastPageTabKey) => void;
  canShowBoosts?: boolean;
  hasPodroll: boolean;
  hasRemoteItems: boolean;
  trailing?: ReactNode;
};

export function AddByRSSPodcastPageListHeader({
  selectedKey,
  onSelect,
  canShowBoosts = false,
  hasPodroll,
  hasRemoteItems,
  trailing,
}: AddByRSSPodcastPageListHeaderProps) {
  const tMedia = useTranslations('media');
  const tInfo = useTranslations('info');
  const tSettings = useTranslations('settings');
  const tValue = useTranslations('value');

  const items: ChipRowItem<AddByRSSPodcastPageTabKey>[] = [
    {
      key: 'episodes',
      label: tMedia('podcast.episodes'),
    },
    {
      key: 'boosts',
      label: tValue('boost'),
    },
    {
      key: 'about',
      label: tInfo('about'),
      hideDesktop: true,
    },
    {
      key: 'podroll',
      label: tInfo('podroll'),
    },
    {
      key: 'remote_items',
      label: tInfo('remote_items'),
    },
    {
      key: 'settings',
      label: tSettings('settings'),
    },
  ];
  const visibleItems = items.filter((item) => {
    if (item.key === 'boosts' && !canShowBoosts) {
      return false;
    }
    if (item.key === 'podroll' && !hasPodroll) {
      return false;
    }
    if (item.key === 'remote_items' && !hasRemoteItems) {
      return false;
    }
    return true;
  });

  return (
    <CommonDetailListHeader
      items={visibleItems}
      onSelect={onSelect}
      selectedKey={selectedKey}
      testId="add-by-rss-podcast-detail-chips"
      trailing={trailing}
    />
  );
}
