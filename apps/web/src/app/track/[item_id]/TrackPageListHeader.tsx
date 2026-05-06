'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { QueryParamsItemMusicType } from '@podverse/helpers-requests';
import { QUERY_PARAMS_ITEM_MUSIC_TYPE_VALUES } from '@podverse/helpers-requests';
import { Button, Tabs } from '@podverse/ui';

import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';
import { useTrackPageContext } from './TrackPageContext';

type TrackPageListHeaderProps = {
  ssrHasTranscripts: boolean;
  ssrCanShowBoosts: boolean;
};

export const TrackPageListHeader: React.FC<TrackPageListHeaderProps> = ({
  ssrHasTranscripts,
  ssrCanShowBoosts,
}) => {
  const { filterParams, setFilterParams, autoScrollOn, setAutoScrollOn } = useTrackPageContext();
  const { type } = filterParams;
  const tInfo = useTranslations('info');
  const tMisc = useTranslations('misc');
  const tValue = useTranslations('value');

  function isItemType(val: string): val is QueryParamsItemMusicType {
    return QUERY_PARAMS_ITEM_MUSIC_TYPE_VALUES.includes(val as QueryParamsItemMusicType);
  }

  const handleTypeChange = (value: string) => {
    if (isItemType(value)) {
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

  if (ssrHasTranscripts) {
    tabData.push({
      key: 'transcript',
      label: tInfo('transcript.lyrics'),
      onClick: () => handleTypeChange('transcript'),
      zIndex: 1,
    });
  }

  if (ssrCanShowBoosts) {
    tabData.push({
      key: 'boosts',
      label: tValue('boost'),
      onClick: () => handleTypeChange('boosts'),
      zIndex: 2,
    });
  }

  let sideButtons: React.ReactNode = null;

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
