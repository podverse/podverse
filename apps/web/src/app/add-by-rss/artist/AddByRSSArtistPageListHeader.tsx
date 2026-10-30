'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import type { ChipRowItem } from '@podverse/ui';

import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';

export type AddByRSSArtistPageTabKey =
  'albums' | 'tracks' | 'boosts' | 'about' | 'podroll' | 'settings';

type AddByRSSArtistPageListHeaderProps = {
  selectedKey: AddByRSSArtistPageTabKey;
  onSelect: (key: AddByRSSArtistPageTabKey) => void;
  hasAlbums: boolean;
  hasTracks: boolean;
  canShowBoosts?: boolean;
  hasDescription: boolean;
  hasPodroll: boolean;
  trailing?: ReactNode;
};

export function AddByRSSArtistPageListHeader({
  selectedKey,
  onSelect,
  hasAlbums,
  hasTracks,
  canShowBoosts = false,
  hasDescription,
  hasPodroll,
  trailing,
}: AddByRSSArtistPageListHeaderProps) {
  const tMedia = useTranslations('media');
  const tInfo = useTranslations('info');
  const tSettings = useTranslations('settings');
  const tValue = useTranslations('value');

  const items: ChipRowItem<AddByRSSArtistPageTabKey>[] = [];

  if (hasAlbums) {
    items.push({
      key: 'albums',
      label: tMedia('music.albums'),
    });
  }

  if (hasTracks) {
    items.push({
      key: 'tracks',
      label: tMedia('music.tracks'),
    });
  }

  if (canShowBoosts) {
    items.push({
      key: 'boosts',
      label: tValue('boost'),
    });
  }

  if (hasDescription) {
    items.push({
      key: 'about',
      label: tInfo('about'),
      hideDesktop: true,
    });
  }

  if (hasPodroll) {
    items.push({
      key: 'podroll',
      label: tInfo('podroll'),
    });
  }

  items.push({
    key: 'settings',
    label: tSettings('settings'),
  });

  return (
    <CommonDetailListHeader
      items={items}
      onSelect={onSelect}
      selectedKey={selectedKey}
      testId="add-by-rss-artist-detail-chips"
      trailing={trailing}
    />
  );
}
