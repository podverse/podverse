'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { Tabs } from '@podverse/ui';

import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';

export type AddByRSSArtistPageTabKey = 'albums' | 'tracks' | 'boosts' | 'about';

type AddByRSSArtistPageListHeaderProps = {
  selectedKey: AddByRSSArtistPageTabKey;
  onSelect: (key: AddByRSSArtistPageTabKey) => void;
  hasAlbums: boolean;
  hasTracks: boolean;
  canShowBoosts?: boolean;
  hasDescription: boolean;
  sideButtons?: React.ReactNode | null;
};

export const AddByRSSArtistPageListHeader: React.FC<AddByRSSArtistPageListHeaderProps> = ({
  selectedKey,
  onSelect,
  hasAlbums,
  hasTracks,
  canShowBoosts = false,
  hasDescription,
  sideButtons = null,
}) => {
  const tMedia = useTranslations('media');
  const tInfo = useTranslations('info');
  const tValue = useTranslations('value');

  const tabData = [];

  if (hasAlbums) {
    tabData.push({
      key: 'albums',
      label: tMedia('music.albums'),
      onClick: () => onSelect('albums'),
      hideDesktop: false,
      zIndex: 7,
    });
  }

  if (hasTracks) {
    tabData.push({
      key: 'tracks',
      label: tMedia('music.tracks'),
      onClick: () => onSelect('tracks'),
      hideDesktop: false,
      zIndex: 6,
    });
  }

  if (canShowBoosts) {
    tabData.push({
      key: 'boosts',
      label: tValue('boost'),
      onClick: () => onSelect('boosts'),
      hideDesktop: false,
      zIndex: 5,
    });
  }

  if (hasDescription) {
    tabData.push({
      key: 'about',
      label: tInfo('about'),
      onClick: () => onSelect('about'),
      hideDesktop: true,
      zIndex: 3,
    });
  }

  return (
    <CommonDetailListHeader
      tabs={<Tabs tabData={tabData} selectedKey={selectedKey} />}
      sideButtons={sideButtons}
    />
  );
};
