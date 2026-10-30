'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { QueryParamsChannelSort, QueryParamsChannelType } from '@podverse/helpers-requests';
import type { ChipRowItem } from '@podverse/ui';

import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';
import { ListSortChip } from '../../../components/ListSortChip/ListSortChip';
import { useAccount } from '../../../contexts/Account';
import { usePodcastPageContext } from './PodcastPageContext';

type PodcastPageListHeaderProps = {
  ssrHasPeople: boolean;
  ssrHasPodroll?: boolean;
  ssrHasRemoteItems?: boolean;
  ssrHasItemSoundbites?: boolean;
  ssrCanShowBoosts?: boolean;
};

export const PodcastPageListHeader: React.FC<PodcastPageListHeaderProps> = ({
  ssrHasPeople,
  ssrHasPodroll,
  ssrHasRemoteItems,
  ssrHasItemSoundbites,
  ssrCanShowBoosts,
}) => {
  const { filterParams, setFilterParams } = usePodcastPageContext();
  const { type, sort, range } = filterParams;
  const tFilters = useTranslations('filters');
  const tMedia = useTranslations('media');
  const tInfo = useTranslations('info');
  const tFeatures = useTranslations('features');
  const tSettings = useTranslations('settings');
  const tValue = useTranslations('value');
  const { loggedInAccount } = useAccount();

  const items: ChipRowItem<QueryParamsChannelType>[] = [
    {
      key: 'episodes',
      label: tMedia('podcast.episodes'),
    },
  ];

  if (ssrHasItemSoundbites) {
    items.push({
      key: 'soundbites',
      label: tInfo('soundbite.official_clips'),
    });
  }

  items.push({
    key: 'clips',
    label: tFeatures('clip.clips'),
  });

  if (ssrCanShowBoosts) {
    items.push({
      key: 'boosts',
      label: tValue('boost'),
    });
  }

  items.push({
    key: 'about',
    label: tInfo('about'),
    hideDesktop: true,
  });

  if (ssrHasPodroll) {
    items.push({
      key: 'podroll',
      label: tInfo('podroll'),
      hideDesktop: true,
    });
  }

  if (ssrHasRemoteItems) {
    items.push({
      key: 'remote-items',
      label: tInfo('remote_items'),
      hideDesktop: true,
    });
  }

  if (ssrHasPeople) {
    items.push({
      key: 'people',
      label: tInfo('people.people'),
      hideDesktop: true,
    });
  }

  if (loggedInAccount) {
    items.push({
      key: 'settings',
      label: tSettings('settings'),
    });
  }

  const sortOptions: { value: QueryParamsChannelSort; label: string }[] = [
    { value: 'recent', label: tFilters('sort.recent') },
    { value: 'oldest', label: tFilters('sort.oldest') },
    { value: 'top', label: tFilters('sort.top') },
  ];

  return (
    <CommonDetailListHeader
      items={items}
      onSelect={(nextType) => {
        setFilterParams({ ...filterParams, type: nextType, page: 1 });
      }}
      selectedKey={type}
      testId="podcast-detail-chips"
      trailing={
        type === 'episodes' || type === 'clips' ? (
          <ListSortChip
            onChange={(nextSort, nextRange) => {
              setFilterParams({ ...filterParams, page: 1, range: nextRange, sort: nextSort });
            }}
            options={sortOptions}
            position="right"
            range={sort === 'top' ? range : null}
            rangeSort="top"
            testId="podcast-detail-sort"
            value={sort}
          />
        ) : null
      }
    />
  );
};
