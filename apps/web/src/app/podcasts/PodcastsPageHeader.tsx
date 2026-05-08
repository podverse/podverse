'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import {
  QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
  QUERY_PARAMS_SUBSCRIBED_TYPE,
} from '@podverse/helpers-requests';
import { MainHeader } from '@podverse/ui';

import { useSubscribedListHeader } from '../../hooks/useSubscribedListHeader';
import { usePodcastsPageContext } from './PodcastsPageContext';
import { getPodcastsPageDropdownConfig } from './PodcastsPageDropdownConfig';

export const PodcastsPageHeader: React.FC = () => {
  const { filterParams, setFilterParams, setShowCategoriesModal } = usePodcastsPageContext();
  const { type, sort, range } = filterParams;
  const tMedia = useTranslations('media');
  const tFilters = useTranslations('filters');
  const tCategories = useTranslations('categories');
  const cfg = getPodcastsPageDropdownConfig({ type, sort, tFilters });
  const { buttonsNode } = useSubscribedListHeader({
    ...cfg,
    defaultGlobalSort: 'recent',
    defaultSubscribedSort: 'a_z',
    filterParams,
    medium: 'av',
    range,
    setFilterParams,
    setShowCategoriesModal,
    sort,
    sortValues: QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
    type,
    typeValues: QUERY_PARAMS_SUBSCRIBED_TYPE,
  });
  const title = filterParams.category
    ? `${tMedia('podcast.podcasts')} > ${tCategories(filterParams.category)}`
    : tMedia('podcast.podcasts');
  return <MainHeader title={title} buttonsNode={buttonsNode} />;
};
