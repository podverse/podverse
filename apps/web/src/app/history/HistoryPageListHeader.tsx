'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { ButtonTabs } from '@podverse/ui';

import { ListHeader } from '../../components/List/ListHeader';
import { useHistoryPageContext } from './HistoryPageContext';

export const HistoryPageListHeader: React.FC = () => {
  const { filterParams, setFilterParams } = useHistoryPageContext();
  const tMedia = useTranslations('media');

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
      belowButtons={
        <ButtonTabs buttonTabs={belowButtons} selectedKey={filterParams.medium ?? 'av'} />
      }
    />
  );
};
