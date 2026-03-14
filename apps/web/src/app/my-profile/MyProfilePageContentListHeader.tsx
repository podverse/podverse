'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import Dropdown from '../../components/Dropdown/Dropdown';
import { ListHeader } from '../../components/List/ListHeader';
import { Tabs } from '../../components/Tabs/Tabs';
import type { MyProfilePageContentTab } from './MyProfilePageContentContext';
import { useMyProfilePageContentContext } from './MyProfilePageContentContext';

import styles from '../../styles/app/profile/ProfileContentListHeader.module.scss';

export const MyProfilePageContentListHeader: React.FC = () => {
  const { selectedTab, setSelectedTab } = useMyProfilePageContentContext();
  const tMedia = useTranslations('media');
  const tFeatures = useTranslations('features');
  const tFilters = useTranslations('filters');

  const tabData = [
    {
      key: 'podcasts',
      label: tMedia('podcast.podcasts'),
      onClick: () => setSelectedTab('podcasts' as MyProfilePageContentTab),
      zIndex: 4,
    },
    {
      key: 'albums',
      label: tMedia('music.albums'),
      onClick: () => setSelectedTab('albums' as MyProfilePageContentTab),
      zIndex: 3,
    },
    {
      key: 'playlists',
      label: tFeatures('playlist.playlists'),
      onClick: () => setSelectedTab('playlists' as MyProfilePageContentTab),
      zIndex: 2,
    },
    {
      key: 'clips',
      label: tFeatures('clip.clips'),
      onClick: () => setSelectedTab('clips' as MyProfilePageContentTab),
      zIndex: 1,
    },
  ];

  // Get the sort label based on current tab
  const getSortLabel = () => {
    if (selectedTab === 'podcasts' || selectedTab === 'albums' || selectedTab === 'playlists') {
      return tFilters('sort.a_z');
    }
    return tFilters('sort.recent');
  };

  // Single item dropdown (informational only)
  const sortMenuItems = [
    {
      label: getSortLabel(),
      param: 'sort',
      value: selectedTab === 'clips' ? 'recent' : 'a_z',
    },
  ];

  const sideButtons = (
    <Dropdown
      key="sort"
      value={selectedTab === 'clips' ? 'recent' : 'a_z'}
      menuItems={sortMenuItems}
      onChange={() => {}} // No-op since sort is fixed
      position="right"
    />
  );

  return (
    <div className={styles.listHeaderWrapper}>
      <ListHeader
        tabs={<Tabs tabData={tabData} selectedKey={selectedTab} />}
        sideButtons={sideButtons}
      />
    </div>
  );
};
