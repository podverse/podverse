'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel } from '@podverse/helpers';
import type { QueryParamsChannelMusicArtistType } from '@podverse/helpers-requests';
import type { ChipRowItem } from '@podverse/ui';

import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';
import { useAccount } from '../../../contexts/Account';
import { useArtistPageAddByRssPresence } from './ArtistPageAddByRssSections';
import { useArtistPageContext } from './ArtistPageContext';

type ArtistPageListHeaderProps = {
  channel: DTOChannel;
  ssrHasPodroll: boolean;
  ssrHasAlbums: boolean;
  ssrHasTracks: boolean;
  ssrHasDescription: boolean;
  ssrHasPeople: boolean;
  ssrCanShowBoosts: boolean;
};

export const ArtistPageListHeader: React.FC<ArtistPageListHeaderProps> = ({
  channel,
  ssrHasPodroll,
  ssrHasAlbums,
  ssrHasTracks,
  ssrHasDescription,
  ssrHasPeople,
  ssrCanShowBoosts,
}) => {
  const presence = useArtistPageAddByRssPresence(channel);
  const showAlbums = ssrHasAlbums || presence.hasAlbums;
  const showTracks = ssrHasTracks || presence.hasTracks;
  const { filterParams, setFilterParams } = useArtistPageContext();
  const { type } = filterParams;
  const tMedia = useTranslations('media');
  const tInfo = useTranslations('info');
  const tSettings = useTranslations('settings');
  const tValue = useTranslations('value');
  const { loggedInAccount } = useAccount();

  const items: ChipRowItem<QueryParamsChannelMusicArtistType>[] = [];

  if (showAlbums) {
    items.push({
      key: 'albums',
      label: tMedia('music.albums'),
    });
  }

  if (showTracks) {
    items.push({
      key: 'tracks',
      label: tMedia('music.tracks'),
    });
  }

  if (ssrHasDescription) {
    items.push({
      key: 'about',
      label: tInfo('about'),
    });
  }

  if (ssrHasPodroll) {
    items.push({
      key: 'podroll',
      label: tInfo('podroll'),
    });
  }

  if (ssrCanShowBoosts) {
    items.push({
      key: 'boosts',
      label: tValue('boost'),
    });
  }

  if (ssrHasPeople) {
    items.push({
      key: 'people',
      label: tInfo('people.people'),
    });
  }

  if (loggedInAccount) {
    items.push({
      key: 'settings',
      label: tSettings('settings'),
    });
  }

  return (
    <CommonDetailListHeader
      items={items}
      onSelect={(nextType) => {
        setFilterParams({ ...filterParams, type: nextType });
      }}
      selectedKey={type}
      testId="artist-detail-chips"
    />
  );
};
