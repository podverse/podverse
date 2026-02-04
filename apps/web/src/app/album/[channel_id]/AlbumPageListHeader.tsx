'use client';

import { useTranslations } from 'next-intl';
import type {
  QueryParamsStatsRange,
  QueryParamsChannelMusicAlbumType,
  QueryParamsChannelMusicAlbumSort,
} from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_STATS_RANGE_VALUES,
  QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_TYPE_VALUES,
  QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_SORT_VALUES,
} from '@podverse/helpers-requests';
import React from 'react';
import Dropdown from '../../../components/Dropdown/Dropdown';
import { Tabs } from '../../../components/Tabs/Tabs';
import { useAccount } from '../../../contexts/Account';
import { useAlbumPageContext } from './AlbumPageContext';
import { getAlbumPageDropdownConfig } from './AlbumPageDropdownConfig';
import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';

type AlbumPageListHeaderProps = {
  ssrHasPodroll?: boolean;
};

export const AlbumPageListHeader: React.FC<AlbumPageListHeaderProps> = ({ ssrHasPodroll }) => {
  const { filterParams, setFilterParams } = useAlbumPageContext();
  const { type, sort, range } = filterParams;
  const tFilters = useTranslations('filters');
  const tMedia = useTranslations('media');
  const tInfo = useTranslations('info');
  const tSettings = useTranslations('settings');
  const { loggedInAccount } = useAccount();

  const { sortMenuItems, rangeMenuItems, showRangeDropdown } = getAlbumPageDropdownConfig({
    sort,
    tFilters,
    tMedia,
  });

  function isChannelType(val: string): val is QueryParamsChannelMusicAlbumType {
    return QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_TYPE_VALUES.includes(
      val as QueryParamsChannelMusicAlbumType
    );
  }
  function isChannelSort(val: string): val is QueryParamsChannelMusicAlbumSort {
    return QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_SORT_VALUES.includes(
      val as QueryParamsChannelMusicAlbumSort
    );
  }
  function isStatsRange(val: string): val is QueryParamsStatsRange {
    return QUERY_PARAMS_STATS_RANGE_VALUES.includes(val as QueryParamsStatsRange);
  }

  const handleTypeChange = (value: string) => {
    if (isChannelType(value)) {
      setFilterParams({ ...filterParams, type: value, page: 1 });
    }
  };

  const handleSortChange = (value: string) => {
    if (isChannelSort(value)) {
      if (value === 'top') {
        setFilterParams({ ...filterParams, sort: value, range: 'week', page: 1 });
      } else {
        setFilterParams({ ...filterParams, sort: value, page: 1 });
      }
    }
  };

  const handleRangeChange = (value: string) => {
    if (isStatsRange(value)) {
      setFilterParams({ ...filterParams, range: value, page: 1 });
    }
  };

  const tabData = [
    {
      key: 'tracks',
      label: tMedia('music.tracks'),
      onClick: () => handleTypeChange('tracks'),
      hideDesktop: false,
      zIndex: 6,
    },
  ];

  tabData.push({
    key: 'about',
    label: tInfo('about'),
    onClick: () => handleTypeChange('about'),
    hideDesktop: true,
    zIndex: 3,
  });

  if (ssrHasPodroll) {
    tabData.push({
      key: 'podroll',
      label: tInfo('podroll'),
      onClick: () => handleTypeChange('podroll'),
      hideDesktop: true,
      zIndex: 2,
    });
  }

  if (loggedInAccount) {
    tabData.push({
      key: 'settings',
      label: tSettings('settings'),
      onClick: () => handleTypeChange('settings'),
      hideDesktop: false,
      zIndex: 1,
    });
  }

  let sideButtons: React.ReactNode = null;
  if (type === 'tracks') {
    sideButtons = (
      <>
        <Dropdown
          key="sort"
          value={sort ?? ''}
          menuItems={sortMenuItems}
          onChange={handleSortChange}
          position="right"
        />
        {showRangeDropdown && (
          <Dropdown
            key="range"
            value={range ?? ''}
            menuItems={rangeMenuItems}
            onChange={handleRangeChange}
            position="right"
          />
        )}
      </>
    );
  }

  return (
    <CommonDetailListHeader
      tabs={<Tabs tabData={tabData} selectedKey={type ?? ''} />}
      sideButtons={sideButtons}
    />
  );
};
