'use client';

import { useTranslations } from 'next-intl';

import type { MediaListChipsConfig } from '../../../components/MediaListChips/MediaListChips';
import { MediaListChips } from '../../../components/MediaListChips/MediaListChips';
import { MediaListTrailingChips } from '../../../components/MediaListChips/MediaListTrailingChips';
import { onClickAllCategories } from '../../../utils/categories';
import { getEpisodesPageSortOptions } from '../episodes/EpisodesPageDropdownConfig';
import { useClipsPageContext } from './ClipsPageContext';

type ClipsPageChipRowProps = { chipsConfig: MediaListChipsConfig };

export function ClipsPageChipRow({ chipsConfig }: ClipsPageChipRowProps) {
  const { filterParams, isCategoryListOpen, scope, setFilterParams, setIsCategoryListOpen } =
    useClipsPageContext();
  const tFilters = useTranslations('filters');

  return (
    <MediaListChips
      {...chipsConfig}
      trailing={
        <MediaListTrailingChips
          category={
            scope === 'browse'
              ? {
                  value: filterParams.category,
                  isListOpen: isCategoryListOpen,
                  setIsListOpen: setIsCategoryListOpen,
                  onClear: () => {
                    onClickAllCategories({
                      filterParams,
                      setFilterParams,
                      setIsCategoryListOpen,
                    });
                  },
                }
              : undefined
          }
          filterParams={filterParams}
          setFilterParams={setFilterParams}
          showViewSelector={false}
          sortOptions={getEpisodesPageSortOptions(tFilters)}
        />
      }
    />
  );
}
