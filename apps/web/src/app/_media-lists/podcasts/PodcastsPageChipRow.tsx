'use client';

import { useTranslations } from 'next-intl';

import type { MediaListChipsConfig } from '../../../components/MediaListChips/MediaListChips';
import { MediaListChips } from '../../../components/MediaListChips/MediaListChips';
import { MediaListTrailingChips } from '../../../components/MediaListChips/MediaListTrailingChips';
import { onClickAllCategories } from '../../../utils/categories';
import { usePodcastsPageContext } from './PodcastsPageContext';
import {
  getPodcastsPageSortOptions,
  podcastsListViewModeScope,
} from './PodcastsPageDropdownConfig';

type PodcastsPageChipRowProps = { chipsConfig: MediaListChipsConfig };

export function PodcastsPageChipRow({ chipsConfig }: PodcastsPageChipRowProps) {
  const { filterParams, isCategoryListOpen, scope, setFilterParams, setIsCategoryListOpen } =
    usePodcastsPageContext();
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
          sortOptions={getPodcastsPageSortOptions({ type: filterParams.type, tFilters })}
          viewModeScope={podcastsListViewModeScope(scope)}
        />
      }
    />
  );
}
