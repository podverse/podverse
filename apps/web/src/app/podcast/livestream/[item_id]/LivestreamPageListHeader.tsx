'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { QueryParamsLiveItemType } from '@podverse/helpers-requests';
import { QUERY_PARAMS_LIVE_ITEM_TYPE_VALUES } from '@podverse/helpers-requests';
import { Tabs } from '@podverse/ui';

import { CommonDetailListHeader } from '../../../../components/Common/List/CommonDetailListHeader';
import { useLivestreamPageContext } from './LivestreamPageContext';

type LivestreamPageListHeaderProps = {
  ssrCanShowBoosts: boolean;
};

export const LivestreamPageListHeader: React.FC<LivestreamPageListHeaderProps> = ({
  ssrCanShowBoosts,
}) => {
  const { filterParams, setFilterParams } = useLivestreamPageContext();
  const { type } = filterParams;
  const tInfo = useTranslations('info');
  const tValue = useTranslations('value');

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

  if (ssrCanShowBoosts) {
    tabData.push({
      key: 'boosts',
      label: tValue('boost'),
      onClick: () => handleTypeChange('boosts'),
      zIndex: 4,
    });
  }

  return <CommonDetailListHeader tabs={<Tabs tabData={tabData} selectedKey={type ?? ''} />} />;
};
