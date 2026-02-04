'use client';

import { useTranslations } from 'next-intl';
import type { QueryParamsLiveItemType } from '@podverse/helpers-requests';
import { QUERY_PARAMS_LIVE_ITEM_TYPE_VALUES } from '@podverse/helpers-requests';
import React from 'react';
import { ListHeader } from '../../../../components/List/ListHeader';
import { useLivestreamPageContext } from './LivestreamPageContext';
import { Tabs } from '../../../../components/Tabs/Tabs';

export const LivestreamPageListHeader: React.FC = () => {
  const { filterParams, setFilterParams } = useLivestreamPageContext();
  const { type } = filterParams;
  const tInfo = useTranslations('info');

  function isLiveItemType(val: string): val is QueryParamsLiveItemType {
    return QUERY_PARAMS_LIVE_ITEM_TYPE_VALUES.includes(val as QueryParamsLiveItemType);
  }

  const handleTypeChange = (value: string) => {
    if (isLiveItemType(value)) {
      setFilterParams({ ...filterParams, type: value });
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

  return <ListHeader tabs={<Tabs tabData={tabData} selectedKey={type ?? ''} />} />;
};
