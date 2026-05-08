'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOPlaylist } from '@podverse/helpers';
import { LazyLoadPlaceholder } from '@podverse/ui';

import { usePlaylistEditPageContext } from './PlaylistEditPageContext';

function PlaylistEditListPlaylistResourcesLoading() {
  const tMisc = useTranslations('misc');
  return <LazyLoadPlaceholder ariaLabel={tMisc('loading')} />;
}

const ListPlaylistResources = dynamic(
  () =>
    import('../../../../components/List/Playlists/ListPlaylistResources').then((m) => ({
      default: m.ListPlaylistResources,
    })),
  {
    ssr: false,
    loading: () => <PlaylistEditListPlaylistResourcesLoading />,
  }
);

type PlaylistEditPageListProps = {
  ssrPlaylist: DTOPlaylist;
};

export const PlaylistEditPageList: React.FC<PlaylistEditPageListProps> = ({ ssrPlaylist }) => {
  const { playlistResources, tabSelectedKey } = usePlaylistEditPageContext();

  if (tabSelectedKey !== 'items') {
    return null;
  }

  return (
    <ListPlaylistResources
      playlist={ssrPlaylist}
      playlistResources={playlistResources}
      isEditMode
    />
  );
};
