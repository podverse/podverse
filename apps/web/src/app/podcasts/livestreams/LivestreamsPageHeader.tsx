'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import {
  QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
  QUERY_PARAMS_SUBSCRIBED_TYPE,
} from '@podverse/helpers-requests';
import { MainHeader } from '@podverse/ui';

import { useSubscribedListHeader } from '../../../hooks/useSubscribedListHeader';
import { getEpisodesPageDropdownConfig } from '../../episodes/EpisodesPageDropdownConfig';
import { useLivestreamsPageContext } from './LivestreamsPageContext';

type LivestreamsPageHeaderProps = { medium: 'av' | 'music' };

export const LivestreamsPageHeader: React.FC<LivestreamsPageHeaderProps> = ({ medium }) => {
  const { filterParams, setFilterParams, setShowCategoriesModal } = useLivestreamsPageContext();
  const { type, sort, range } = filterParams;
  const tMedia = useTranslations('media');
  const tFilters = useTranslations('filters');
  const tCategories = useTranslations('categories');
  const cfg = getEpisodesPageDropdownConfig({ medium, type, sort, tFilters });
  const { buttonsNode } = useSubscribedListHeader({
    ...cfg,
    defaultGlobalSort: 'recent',
    defaultSubscribedSort: 'recent',
    filterParams,
    medium,
    preserveAcrossUpdates: (fp) => ({ liveItemType: fp.liveItemType }),
    range,
    setFilterParams,
    setShowCategoriesModal,
    sort,
    sortValues: QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
    type,
    typeValues: QUERY_PARAMS_SUBSCRIBED_TYPE,
  });
  const title = filterParams.category
    ? `${tMedia('livestream.livestreams')} > ${tCategories(filterParams.category)}`
    : tMedia('livestream.livestreams');
  return <MainHeader title={title} buttonsNode={buttonsNode} />;
};
