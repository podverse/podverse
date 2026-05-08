'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import {
  QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
  QUERY_PARAMS_SUBSCRIBED_TYPE,
} from '@podverse/helpers-requests';
import { MainHeader } from '@podverse/ui';

import { useSubscribedListHeader } from '../../hooks/useSubscribedListHeader';
import { useEpisodesPageContext } from './EpisodesPageContext';
import { getEpisodesPageDropdownConfig } from './EpisodesPageDropdownConfig';

export const EpisodesPageHeader: React.FC = () => {
  const { filterParams, setFilterParams, setShowCategoriesModal } = useEpisodesPageContext();
  const { type, sort, range } = filterParams;
  const tMedia = useTranslations('media');
  const tFilters = useTranslations('filters');
  const tCategories = useTranslations('categories');
  const cfg = getEpisodesPageDropdownConfig({ type, sort, tFilters });
  const { buttonsNode } = useSubscribedListHeader({
    ...cfg,
    defaultGlobalSort: 'recent',
    defaultSubscribedSort: 'recent',
    filterParams,
    medium: 'av',
    range,
    setFilterParams,
    setShowCategoriesModal,
    sort,
    sortValues: QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
    type,
    typeValues: QUERY_PARAMS_SUBSCRIBED_TYPE,
  });
  const title = filterParams.category
    ? `${tMedia('podcast.episodes')} > ${tCategories(filterParams.category)}`
    : tMedia('podcast.episodes');
  return <MainHeader title={title} buttonsNode={buttonsNode} />;
};
