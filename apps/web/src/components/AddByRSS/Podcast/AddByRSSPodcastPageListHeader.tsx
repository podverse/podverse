'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { Tabs } from '../../Tabs/Tabs';
import { CommonDetailListHeader } from '../../Common/List/CommonDetailListHeader';

type AddByRSSPodcastPageTabKey = 'episodes' | 'about' | 'settings';

type AddByRSSPodcastPageListHeaderProps = {
  selectedKey: AddByRSSPodcastPageTabKey;
  onSelect: (key: AddByRSSPodcastPageTabKey) => void;
};

export const AddByRSSPodcastPageListHeader: React.FC<AddByRSSPodcastPageListHeaderProps> = ({
  selectedKey,
  onSelect,
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

  return <CommonDetailListHeader tabs={<Tabs tabData={tabData} selectedKey={selectedKey} />} />;
};
