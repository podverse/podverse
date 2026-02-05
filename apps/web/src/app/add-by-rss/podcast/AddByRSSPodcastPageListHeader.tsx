'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { Tabs } from '../../../components/Tabs/Tabs';
import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';

type AddByRSSPodcastPageTabKey = 'episodes' | 'about' | 'settings';

type AddByRSSPodcastPageListHeaderProps = {
  selectedKey: AddByRSSPodcastPageTabKey;
  onSelect: (key: AddByRSSPodcastPageTabKey) => void;
  sideButtons?: React.ReactNode | null;
};

export const AddByRSSPodcastPageListHeader: React.FC<AddByRSSPodcastPageListHeaderProps> = ({
  selectedKey,
  onSelect,
  sideButtons = null,
}) => {
  const tMedia = useTranslations('media');
  const tInfo = useTranslations('info');
  const tSettings = useTranslations('settings');

  const tabData = [
    {
      key: 'episodes',
      label: tMedia('podcast.episodes'),
      onClick: () => onSelect('episodes'),
      hideDesktop: false,
      zIndex: 6,
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

  return (
    <CommonDetailListHeader
      tabs={<Tabs tabData={tabData} selectedKey={selectedKey} />}
      sideButtons={sideButtons}
    />
  );
};
