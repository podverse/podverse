'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';
import { Tabs } from '../../../components/Tabs/Tabs';

export type AddByRSSAlbumPageTabKey = 'tracks' | 'boosts' | 'about' | 'settings';

type AddByRSSAlbumPageListHeaderProps = {
  selectedKey: AddByRSSAlbumPageTabKey;
  onSelect: (key: AddByRSSAlbumPageTabKey) => void;
  canShowBoosts?: boolean;
  sideButtons?: React.ReactNode | null;
};

export const AddByRSSAlbumPageListHeader: React.FC<AddByRSSAlbumPageListHeaderProps> = ({
  selectedKey,
  onSelect,
  canShowBoosts = false,
  sideButtons = null,
}) => {
  const tMedia = useTranslations('media');
  const tInfo = useTranslations('info');
  const tSettings = useTranslations('settings');
  const tValue = useTranslations('value');

  const tabData = [
    {
      key: 'tracks',
      label: tMedia('music.tracks'),
      onClick: () => onSelect('tracks'),
      hideDesktop: false,
      zIndex: 6,
    },
    {
      key: 'boosts',
      label: tValue('boost'),
      onClick: () => onSelect('boosts'),
      hideDesktop: false,
      zIndex: 5,
    },
    {
      key: 'about',
      label: tInfo('about'),
      onClick: () => onSelect('about'),
      hideDesktop: true,
      zIndex: 3,
    },
    {
      key: 'settings',
      label: tSettings('settings'),
      onClick: () => onSelect('settings'),
      hideDesktop: false,
      zIndex: 1,
    },
  ];
  const filteredTabData = canShowBoosts ? tabData : tabData.filter((tab) => tab.key !== 'boosts');

  return (
    <CommonDetailListHeader
      tabs={<Tabs tabData={filteredTabData} selectedKey={selectedKey} />}
      sideButtons={sideButtons}
    />
  );
};
