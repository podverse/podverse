'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import type { ChipRowItem } from '@podverse/ui';

import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';

export type AddByRSSAlbumPageTabKey =
  'tracks' | 'boosts' | 'about' | 'podroll' | 'remote_items' | 'settings';

type AddByRSSAlbumPageListHeaderProps = {
  selectedKey: AddByRSSAlbumPageTabKey;
  onSelect: (key: AddByRSSAlbumPageTabKey) => void;
  canShowBoosts?: boolean;
  hasPodroll: boolean;
  hasRemoteItems: boolean;
  trailing?: ReactNode;
};

export function AddByRSSAlbumPageListHeader({
  selectedKey,
  onSelect,
  canShowBoosts = false,
  hasPodroll,
  hasRemoteItems,
  trailing,
}: AddByRSSAlbumPageListHeaderProps) {
  const tMedia = useTranslations('media');
  const tInfo = useTranslations('info');
  const tSettings = useTranslations('settings');
  const tValue = useTranslations('value');

  const items: ChipRowItem<AddByRSSAlbumPageTabKey>[] = [
    {
      key: 'tracks',
      label: tMedia('music.tracks'),
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
      testId="add-by-rss-album-detail-chips"
      trailing={trailing}
    />
  );
}
