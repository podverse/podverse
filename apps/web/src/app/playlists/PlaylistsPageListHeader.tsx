'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type {
  QueryParamsPlaylistsType,
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
} from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_PLAYLISTS_TYPE_VALUES,
  QUERY_PARAMS_STATS_RANGE_VALUES,
  QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
} from '@podverse/helpers-requests';
import { ButtonTabs, Dropdown, Tabs } from '@podverse/ui';

import { ListHeader } from '../../components/List/ListHeader';
import { usePlaylistsPageContext } from './PlaylistsPageContext';
import { getPlaylistsPageDropdownConfig } from './PlaylistsPageDropdownConfig';

import styles from '../../styles/app/playlists/PlaylistsListHeader.module.scss';

export const PlaylistsPageListHeader: React.FC = () => {
  const { filterParams, setFilterParams } = usePlaylistsPageContext();
  const { type, sort, range } = filterParams;
  const tFilters = useTranslations('filters');
  const tMedia = useTranslations('media');
  const tFeatures = useTranslations('features');
  const { sortMenuItems, rangeMenuItems, showRangeDropdown } = getPlaylistsPageDropdownConfig({
    type,
    sort,
    tFilters,
  });

  function isPlaylistType(val: string): val is QueryParamsPlaylistsType {
    return QUERY_PARAMS_PLAYLISTS_TYPE_VALUES.includes(val as QueryParamsPlaylistsType);
  }

  function isPlaylistSort(val: string): val is QueryParamsSubscribedFullSort {
    return QUERY_PARAMS_SUBSCRIBED_FULL_SORT.includes(val as QueryParamsSubscribedFullSort);
  }

  function isStatsRange(val: string): val is QueryParamsStatsRange {
    return QUERY_PARAMS_STATS_RANGE_VALUES.includes(val as QueryParamsStatsRange);
  }

  const handleTypeChange = (value: string) => {
    if (isPlaylistType(value)) {
      if (value === 'public') {
        setFilterParams({ ...filterParams, type: value, sort: 'top', range: 'week', page: 1 });
      } else if (value === 'private') {
        setFilterParams({ ...filterParams, type: value, sort: 'a_z', page: 1 });
      } else if (value === 'private_followed') {
        setFilterParams({ ...filterParams, type: value, sort: 'a_z', page: 1 });
      }
    }
  };

  const handleSortChange = (value: string) => {
    if (isPlaylistSort(value)) {
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
      key: 'private',
      label: tFeatures('playlist.my_playlists'),
      onClick: () => handleTypeChange('private'),
      zIndex: 3,
    },
    {
      key: 'private_followed',
      label: tFilters('type.subscribed'),
      onClick: () => handleTypeChange('private_followed'),
      zIndex: 2,
    },
    {
      key: 'public',
      label: tFilters('type.global'),
      onClick: () => handleTypeChange('public'),
      zIndex: 1,
    },
  ];

  const sideButtons = (
    <div className={styles.sideButtonsWrapper}>
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
    </div>
  );

  const belowButtons = [
    {
      key: 'av',
      label: tMedia('podcast.podcasts'),
      onClick: () => setFilterParams({ ...filterParams, medium: 'av' }),
    },
    {
      key: 'music',
      label: tMedia('music.music'),
      onClick: () => setFilterParams({ ...filterParams, medium: 'music' }),
    },
  ];

  return (
    <ListHeader
      tabs={<Tabs tabData={tabData} selectedKey={type ?? ''} />}
      belowButtons={
        <div className={styles.belowButtonsWrapper}>
          <div className={styles.tabsWrapper}>
            <ButtonTabs buttonTabs={belowButtons} selectedKey={filterParams.medium ?? 'av'} />
          </div>
          {sideButtons}
        </div>
      }
    />
  );
};
