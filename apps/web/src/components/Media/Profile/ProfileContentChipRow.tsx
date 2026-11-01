'use client';

import { useTranslations } from 'next-intl';

import type { ChipRowItem } from '@podverse/ui';
import { ChipRow } from '@podverse/ui';

import { ListSortChip } from '../../ListSortChip/ListSortChip';

import chipRowStyles from '../../../styles/components/MediaListChips/MediaListChips.module.scss';

export type ProfileContentChip = 'podcasts' | 'albums' | 'playlists' | 'clips';

type ProfileContentChipRowProps = {
  selected: ProfileContentChip;
  onSelect: (chip: ProfileContentChip) => void;
  /** Distinguishes own vs public profile chip rows in tests. */
  testId: string;
};

/**
 * Podcasts, Albums, Playlists, and Clips, with the fixed sort chip last. Sort is A-Z except
 * clips, which are Recent; the face shows that order without a menu.
 */
export function ProfileContentChipRow({ selected, onSelect, testId }: ProfileContentChipRowProps) {
  const tMedia = useTranslations('media');
  const tFeatures = useTranslations('features');
  const tFilters = useTranslations('filters');

  const items: ChipRowItem<ProfileContentChip>[] = [
    { key: 'podcasts', label: tMedia('podcast.podcasts') },
    { key: 'albums', label: tMedia('music.albums') },
    { key: 'playlists', label: tFeatures('playlist.playlists') },
    { key: 'clips', label: tFeatures('clip.clips') },
  ];

  const sortValue = selected === 'clips' ? 'recent' : 'a_z';
  const sortLabel = selected === 'clips' ? tFilters('sort.recent') : tFilters('sort.a_z');

  return (
    <ChipRow
      className={chipRowStyles.chipRow}
      items={items}
      memoryKey={`${testId}-chips`}
      onSelect={onSelect}
      selectedKey={selected}
      testId={testId}
      trailing={
        <ListSortChip
          onChange={() => {}}
          options={[{ value: sortValue, label: sortLabel }]}
          range={null}
          testId={`${testId}-sort`}
          value={sortValue}
        />
      }
    />
  );
}
