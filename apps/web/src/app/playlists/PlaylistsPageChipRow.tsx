'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import type { QueryParamsQueueMedium } from '@podverse/helpers';
import type { ChipRowItem, MenuChipOption } from '@podverse/ui';
import { Button, ChipRow, ChipRowWithActions, MenuChip } from '@podverse/ui';

import type { MediaListChipsConfig } from '../../components/MediaListChips/MediaListChips';
import { MediaListChips } from '../../components/MediaListChips/MediaListChips';
import { MediaListTrailingChips } from '../../components/MediaListChips/MediaListTrailingChips';
import { usePlaylistsPageContext } from './PlaylistsPageContext';
import { getPlaylistsPageSortOptions } from './PlaylistsPageDropdownConfig';

import chipRowStyles from '../../styles/components/MediaListChips/MediaListChips.module.scss';

type PlaylistsTypeKey = 'private' | 'private_followed' | 'public';

export function PlaylistsPageChipRow({ chipsConfig }: { chipsConfig?: MediaListChipsConfig }) {
  const { filterParams, listScope, setFilterParams } = usePlaylistsPageContext();
  const router = useRouter();
  const tFeatures = useTranslations('features');
  const tFilters = useTranslations('filters');
  const tMedia = useTranslations('media');

  function handleTypeChange(type: PlaylistsTypeKey) {
    if (type === filterParams.type) {
      return;
    }
    if (type === 'public') {
      setFilterParams({ ...filterParams, type, sort: 'top', range: 'week', page: 1 });
      return;
    }
    setFilterParams({ ...filterParams, type, sort: 'a_z', range: null, page: 1 });
  }

  const medium: QueryParamsQueueMedium =
    filterParams.medium === 'av' || filterParams.medium === 'music' ? filterParams.medium : 'all';
  const mediumLabel =
    medium === 'music'
      ? tMedia('music.music')
      : medium === 'av'
        ? tMedia('podcast.podcasts')
        : tFilters('type.all');
  const mediumOptions: MenuChipOption<QueryParamsQueueMedium>[] = [
    { value: 'all', label: tFilters('type.all') },
    { value: 'av', label: tMedia('podcast.podcasts') },
    { value: 'music', label: tMedia('music.music') },
  ];
  const typeItems: ChipRowItem<PlaylistsTypeKey>[] = [
    { key: 'private', label: tFeatures('playlist.my_playlists') },
    { key: 'private_followed', label: tFilters('type.subscribed') },
    { key: 'public', label: tFilters('type.global') },
  ];

  const trailing = (
    <>
      <MenuChip
        faceLabel={mediumLabel}
        label={tFilters('screen.filter_heading')}
        onSelect={(nextMedium) => setFilterParams({ ...filterParams, medium: nextMedium, page: 1 })}
        options={mediumOptions}
        selected
        testId="playlists-medium"
        value={medium}
      />
      <MediaListTrailingChips
        filterParams={filterParams}
        setFilterParams={setFilterParams}
        showViewSelector={false}
        sortOptions={getPlaylistsPageSortOptions({ type: filterParams.type, tFilters })}
      />
    </>
  );

  const createPlaylist =
    listScope === 'browse' ? undefined : (
      <Button variant="mini" onClick={() => router.push('/playlist/create')}>
        {tFeatures('playlist.create_playlist')}
      </Button>
    );

  if (chipsConfig !== undefined) {
    return <MediaListChips {...chipsConfig} actions={createPlaylist} trailing={trailing} />;
  }

  const typeRow = (
    <ChipRow
      className={createPlaylist === undefined ? chipRowStyles.chipRow : undefined}
      items={typeItems}
      onSelect={handleTypeChange}
      selectedKey={filterParams.type}
      testId="playlists-type-chips"
      trailing={trailing}
    />
  );

  if (createPlaylist === undefined) {
    return typeRow;
  }

  return (
    <ChipRowWithActions actions={createPlaylist} className={chipRowStyles.chipRow}>
      {typeRow}
    </ChipRowWithActions>
  );
}
