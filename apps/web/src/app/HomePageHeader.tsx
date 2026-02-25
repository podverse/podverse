'use client';

import { useTranslations } from 'next-intl';
import type { QueryParamsMedium } from '@podverse/helpers';
import { QUERY_PARAMS_MEDIUMS } from '@podverse/helpers';
import type { QueryParamsHomeSort } from '@podverse/helpers-requests';
import { QUERY_PARAMS_HOME_SORT_VALUES } from '@podverse/helpers-requests';
import React from 'react';
import Dropdown from '../components/Dropdown/Dropdown';
import { ViewSelector } from '../components/ViewSelector/ViewSelector';
import { useLocalSettings } from '../contexts/LocalSettings';
import { useHomePageContext } from './HomePageContext';
import { getHomePageDropdownConfig } from './HomePageDropdownConfig';
import { CommonListPageHeader } from '../components/Common/List/CommonListPageHeader';

export const HomePageHeader: React.FC = () => {
  const { filterParams, setFilterParams } = useHomePageContext();
  const { viewSelected, setViewSelected } = useLocalSettings();
  const { sort, medium } = filterParams;
  const tMedia = useTranslations('media');
  const tFilters = useTranslations('filters');
  const tSubscriptions = useTranslations('subscriptions');
  const { mediumMenuItems, sortMenuItems } = getHomePageDropdownConfig({
    medium,
    sort,
    tFilters,
    tMedia,
  });

  function isMedium(val: string): val is QueryParamsMedium {
    return QUERY_PARAMS_MEDIUMS.includes(val as QueryParamsMedium);
  }
  function isHomeSort(val: string): val is QueryParamsHomeSort {
    return QUERY_PARAMS_HOME_SORT_VALUES.includes(val as QueryParamsHomeSort);
  }

  const handleMediumChange = (value: string) => {
    if (isMedium(value)) {
      setFilterParams({ ...filterParams, medium: value, page: 1 });
    }
  };

  const handleSortChange = (value: string) => {
    if (isHomeSort(value)) {
      setFilterParams({ ...filterParams, sort: value, page: 1 });
    }
  };

  const buttonsNode = (
    <>
      <Dropdown
        key="medium"
        value={medium ?? ''}
        menuItems={mediumMenuItems}
        onChange={handleMediumChange}
      />
      <Dropdown
        key="sort"
        value={sort ?? ''}
        menuItems={sortMenuItems}
        onChange={handleSortChange}
      />
      <ViewSelector viewSelected={viewSelected} setViewSelected={setViewSelected} />
    </>
  );

  return <CommonListPageHeader title={tSubscriptions('subscriptions')} buttonsNode={buttonsNode} />;
};
