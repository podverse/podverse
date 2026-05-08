'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import {
  QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
  QUERY_PARAMS_SUBSCRIBED_TYPE,
} from '@podverse/helpers-requests';
import { MainHeader } from '@podverse/ui';

import { useSubscribedListHeader } from '../../hooks/useSubscribedListHeader';
import { getEpisodesPageDropdownConfig } from '../episodes/EpisodesPageDropdownConfig';
import { useClipsPageContext } from './ClipsPageContext';

export const ClipsPageHeader: React.FC = () => {
  const { filterParams, setFilterParams, setShowCategoriesModal } = useClipsPageContext();
  const { type, sort, range } = filterParams;
  const tFilters = useTranslations('filters');
  const tCategories = useTranslations('categories');
  const tFeatures = useTranslations('features');
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
    ? `${tFeatures('clip.clips')} > ${tCategories(filterParams.category)}`
    : tFeatures('clip.clips');
  return <MainHeader title={title} buttonsNode={buttonsNode} />;
};
