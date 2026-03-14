'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';
import { Tabs } from '../../../components/Tabs/Tabs';

export type AddByRSSArtistPageTabKey = 'albums' | 'tracks' | 'about';

type AddByRSSArtistPageListHeaderProps = {
  selectedKey: AddByRSSArtistPageTabKey;
  onSelect: (key: AddByRSSArtistPageTabKey) => void;
  hasAlbums: boolean;
  hasTracks: boolean;
  hasDescription: boolean;
  sideButtons?: React.ReactNode | null;
};

export const AddByRSSArtistPageListHeader: React.FC<AddByRSSArtistPageListHeaderProps> = ({
  selectedKey,
  onSelect,
  hasAlbums,
  hasTracks,
  hasDescription,
  sideButtons = null,
}) => {
  const tMedia = useTranslations('media');
  const tInfo = useTranslations('info');

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
