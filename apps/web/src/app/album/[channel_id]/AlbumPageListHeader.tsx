'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type {
  QueryParamsChannelMusicAlbumSort,
  QueryParamsChannelMusicAlbumType,
} from '@podverse/helpers-requests';
import type { ChipRowItem } from '@podverse/ui';

import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';
import { ListSortChip } from '../../../components/ListSortChip/ListSortChip';
import { useAccount } from '../../../contexts/Account';
import { useAlbumPageContext } from './AlbumPageContext';

type AlbumPageListHeaderProps = {
  ssrHasPeople: boolean;
  ssrHasPodroll?: boolean;
  ssrHasRemoteItems?: boolean;
  ssrCanShowBoosts: boolean;
};

export const AlbumPageListHeader: React.FC<AlbumPageListHeaderProps> = ({
  ssrHasPeople,
  ssrHasPodroll,
  ssrHasRemoteItems,
  ssrCanShowBoosts,
}) => {
  const { filterParams, setFilterParams } = useAlbumPageContext();
  const { type, sort, range } = filterParams;
  const tFilters = useTranslations('filters');
  const tMedia = useTranslations('media');
  const tInfo = useTranslations('info');
  const tSettings = useTranslations('settings');
  const tValue = useTranslations('value');
  const { loggedInAccount } = useAccount();

  const items: ChipRowItem<QueryParamsChannelMusicAlbumType>[] = [
    {
      key: 'tracks',
      label: tMedia('music.tracks'),
    },
  ];

  items.push({
    key: 'about',
    label: tInfo('about'),
    hideDesktop: true,
  });

  if (ssrCanShowBoosts) {
    items.push({
      key: 'boosts',
      label: tValue('boost'),
    });
  }

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

  const sortOptions: { value: QueryParamsChannelMusicAlbumSort; label: string }[] = [
    { value: 'forward', label: tFilters('sort.forward') },
    { value: 'backward', label: tFilters('sort.backward') },
    { value: 'top', label: tFilters('sort.top') },
  ];

  return (
    <CommonDetailListHeader
      items={items}
      onSelect={(nextType) => {
        setFilterParams({ ...filterParams, type: nextType, page: 1 });
      }}
      selectedKey={type}
      testId="album-detail-chips"
      trailing={
        type === 'tracks' ? (
          <ListSortChip
            onChange={(nextSort, nextRange) => {
              setFilterParams({ ...filterParams, page: 1, range: nextRange, sort: nextSort });
            }}
            options={sortOptions}
            position="right"
            range={sort === 'top' ? range : null}
            rangeSort="top"
            testId="album-detail-sort"
            value={sort}
          />
        ) : null
      }
    />
  );
};
