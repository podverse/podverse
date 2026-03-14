'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type {
  QueryParamsItemSort,
  QueryParamsItemType,
  QueryParamsStatsRange,
} from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_ITEM_SORT_VALUES,
  QUERY_PARAMS_ITEM_TYPE_VALUES,
  QUERY_PARAMS_STATS_RANGE_VALUES,
} from '@podverse/helpers-requests';

import { Button } from '../../../components/Button/Button';
import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';
import Dropdown from '../../../components/Dropdown/Dropdown';
import { Tabs } from '../../../components/Tabs/Tabs';
import { useEpisodePageContext } from './EpisodePageContext';
import { getEpisodePageDropdownConfig } from './EpisodePageDropdownConfig';

type EpisodePageListHeaderProps = {
  ssrHasChapters: boolean;
  ssrHasSoundbites: boolean;
  ssrHasTranscripts: boolean;
};

export const EpisodePageListHeader: React.FC<EpisodePageListHeaderProps> = ({
  ssrHasChapters,
  ssrHasSoundbites,
  ssrHasTranscripts,
}) => {
  const { filterParams, setFilterParams, autoScrollOn, setAutoScrollOn } = useEpisodePageContext();
  const { type, sort, range } = filterParams;
  const tFilters = useTranslations('filters');
  const tInfo = useTranslations('info');
  const tFeatures = useTranslations('features');
  const tMisc = useTranslations('misc');

  const { sortMenuItems, rangeMenuItems, showRangeDropdown } = getEpisodePageDropdownConfig({
    sort,
    tFilters,
  });

  function isItemType(val: string): val is QueryParamsItemType {
    return QUERY_PARAMS_ITEM_TYPE_VALUES.includes(val as QueryParamsItemType);
  }
  function isItemSort(val: string): val is QueryParamsItemSort {
    return QUERY_PARAMS_ITEM_SORT_VALUES.includes(val as QueryParamsItemSort);
  }
  function isStatsRange(val: string): val is QueryParamsStatsRange {
    return QUERY_PARAMS_STATS_RANGE_VALUES.includes(val as QueryParamsStatsRange);
  }

  const handleTypeChange = (value: string) => {
    if (isItemType(value)) {
      setFilterParams({ ...filterParams, type: value, page: 1 });
    }
  };

  const handleSortChange = (value: string) => {
    if (isItemSort(value)) {
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
      key: 'summary',
      label: tInfo('summary.summary'),
      onClick: () => handleTypeChange('summary'),
      zIndex: 5,
    },
  ];

  if (ssrHasChapters) {
    tabData.push({
      key: 'chapters',
      label: tInfo('chapter.chapters'),
      onClick: () => handleTypeChange('chapters'),
      zIndex: 4,
    });
  }

  if (ssrHasSoundbites) {
    tabData.push({
      key: 'soundbites',
      label: tInfo('soundbite.official_clips'),
      onClick: () => handleTypeChange('soundbites'),
      zIndex: 3,
    });
  }

  tabData.push({
    key: 'clips',
    label: tFeatures('clip.clips'),
    onClick: () => handleTypeChange('clips'),
    zIndex: 2,
  });

  if (ssrHasTranscripts) {
    tabData.push({
      key: 'transcript',
      label: tInfo('transcript.transcript'),
      onClick: () => handleTypeChange('transcript'),
      zIndex: 1,
    });
  }

  let sideButtons: React.ReactNode = null;
  if (type === 'soundbites' || type === 'clips') {
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

  if (type === 'transcript') {
    sideButtons = (
      <Button onClick={() => setAutoScrollOn(!autoScrollOn)} variant="mini">
        {autoScrollOn ? tMisc('autoscroll.autoscroll_on') : tMisc('autoscroll.autoscroll_off')}
      </Button>
    );
  }

  return (
    <CommonDetailListHeader
      tabs={<Tabs tabData={tabData} selectedKey={type ?? ''} />}
      sideButtons={sideButtons}
    />
  );
};
