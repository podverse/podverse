'use client';

import { useTranslations } from 'next-intl';

import type { MediaListChipsConfig } from '../../../components/MediaListChips/MediaListChips';
import { MediaListChips } from '../../../components/MediaListChips/MediaListChips';
import { MediaListTrailingChips } from '../../../components/MediaListChips/MediaListTrailingChips';
import { onClickAllCategories } from '../../../utils/categories';
import { useEpisodesPageContext } from './EpisodesPageContext';
import { getEpisodesPageSortOptions } from './EpisodesPageDropdownConfig';

type EpisodesPageChipRowProps = { chipsConfig: MediaListChipsConfig };

export function EpisodesPageChipRow({ chipsConfig }: EpisodesPageChipRowProps) {
  const { filterParams, isCategoryListOpen, scope, setFilterParams, setIsCategoryListOpen } =
    useEpisodesPageContext();
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
          showViewSelector
          sortOptions={getEpisodesPageSortOptions(tFilters)}
        />
      }
    />
  );
}
