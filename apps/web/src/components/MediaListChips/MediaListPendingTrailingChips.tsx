'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type { MenuChipOption } from '@podverse/ui';
import { MenuChip } from '@podverse/ui';

import { useAccount } from '../../contexts/Account';
import { useListViewMode } from '../../hooks/useListViewMode';
import type { MediaListChip, MediaListChipsPage } from '../../utils/mediaListChips';
import { mediaListChipChrome } from '../../utils/mediaListChips';
import { CategoriesChip } from '../Category/CategoriesChip';
import { ListSortChip } from '../ListSortChip/ListSortChip';
import { ViewSelector } from '../ViewSelector/ViewSelector';
import { resolvePendingMediaListChrome } from './resolvePendingMediaListChrome';

type MediaListPendingTrailingChipsProps = {
  page: MediaListChipsPage;
  chip: MediaListChip;
};

/**
 * Trailing controls for a chip that is pressed but whose list has not arrived. Reads remembered
 * sort and layout so the row matches the destination chip on the click.
 */
export function MediaListPendingTrailingChips({ page, chip }: MediaListPendingTrailingChipsProps) {
  const chrome = useMemo(() => mediaListChipChrome(page, chip), [page, chip]);
  const { loggedInAccount } = useAccount();
  const isValidAuthSession = loggedInAccount !== null;
  const tFilters = useTranslations('filters');
  const tMedia = useTranslations('media');
  const { viewSelected, setViewSelected } = useListViewMode(chrome.viewModeScope);
  const [revision, setRevision] = useState(0);

  const resolved = useMemo(() => {
    void revision;
    return resolvePendingMediaListChrome({
      page,
      chip,
      chrome,
      isValidAuthSession,
      tFilters,
    });
  }, [chip, chrome, isValidAuthSession, page, revision, tFilters]);

  if (
    !chrome.showCategory &&
    !chrome.showSort &&
    !chrome.showViewSelector &&
    !chrome.showPlaylistsMedium
  ) {
    return null;
  }

  const mediumOptions: MenuChipOption<'all' | 'av' | 'music'>[] = [
    { value: 'all', label: tFilters('type.all') },
    { value: 'av', label: tMedia('podcast.podcasts') },
    { value: 'music', label: tMedia('music.music') },
  ];
  const mediumLabel =
    resolved.medium === null
      ? ''
      : resolved.medium.value === 'music'
        ? tMedia('music.music')
        : resolved.medium.value === 'av'
          ? tMedia('podcast.podcasts')
          : tFilters('type.all');

  return (
    <>
      {chrome.showCategory ? (
        <CategoriesChip category={resolved.category} isListOpen={false} onToggle={() => undefined} />
      ) : null}
      {chrome.showPlaylistsMedium && resolved.medium !== null ? (
        <MenuChip
          faceLabel={mediumLabel}
          label={tFilters('screen.filter_heading')}
          onSelect={(nextMedium) => {
            resolved.medium?.write(nextMedium);
            setRevision((n) => n + 1);
          }}
          options={mediumOptions}
          selected
          testId="playlists-medium"
          value={resolved.medium.value}
        />
      ) : null}
      {chrome.showSort && resolved.sort !== null ? (
        <ListSortChip
          onChange={(sort, range) => {
            resolved.sort?.write(sort, range);
            setRevision((n) => n + 1);
          }}
          options={resolved.sort.options}
          range={resolved.sort.range}
          rangeSort={resolved.sort.rangeSort}
          testId="media-list-sort"
          value={resolved.sort.value}
        />
      ) : null}
      {chrome.showViewSelector ? (
        <ViewSelector setViewSelected={setViewSelected} viewSelected={viewSelected} />
      ) : null}
    </>
  );
}
