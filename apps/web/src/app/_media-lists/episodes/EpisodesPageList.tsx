import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import type { AddByRSSResourceType, DTOCategory } from '@podverse/helpers';

import { CategoriesList } from '../../../components/Category/CategoriesList';
import { CoreEpisodes } from '../../../components/Core/Podcast/Episodes/CoreEpisodes';
import { HowToStartInfo } from '../../../components/HowToStartInfo/HowToStartInfo';
import { WebLoadingSpinnerOverlay } from '../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { NoResults } from '../../../components/NoResults/NoResults';
import { useLocalSettings } from '../../../contexts/LocalSettings';
import { useSubscribedAddByRSSItems } from '../../../hooks/useSubscribedAddByRSSItems';
import { onClickAllCategories, onClickCategory } from '../../../utils/categories';
import {
  buildMediaListChipPath,
  shouldShowBrowseEmptyMessage,
} from '../../../utils/mediaListChips';
import { mergeSubscribedItemEntries } from '../../../utils/subscribed/mergeSubscribedItems';
import { useEpisodesPageContext } from './EpisodesPageContext';

const NO_TYPES: readonly AddByRSSResourceType[] = [];
const ADD_BY_RSS_EPISODE_TYPES = ['podcasts', 'episodes'] as const;

export const EpisodesPageList: React.FC = () => {
  const {
    filterParams,
    setFilterParams,
    items,
    totalPages,
    isLoading,
    showSubscribeMessage,
    isCategoryListOpen,
    setIsCategoryListOpen,
    scope,
  } = useEpisodesPageContext();
  const { viewSelected } = useLocalSettings();
  const tMedia = useTranslations('media');
  const { page, sort: listSort, type } = filterParams;
  const router = useRouter();
  // Subscribed Episodes offers Recent and Top. Any other sort stays the server list.
  const sort = listSort === 'recent' || listSort === 'top' ? listSort : null;
  const addByRSS = useSubscribedAddByRSSItems(
    scope === 'subscribed' ? ADD_BY_RSS_EPISODE_TYPES : NO_TYPES
  );
  const entries = useMemo(() => {
    if (sort === null || addByRSS.items.length === 0) {
      return undefined;
    }
    return mergeSubscribedItemEntries({
      serverItems: items,
      addByRSSItems: addByRSS.items,
      sort,
      page,
      totalPages,
    });
  }, [addByRSS.items, items, page, sort, totalPages]);

  const handleOnClickCategory = (category: DTOCategory) => {
    onClickCategory({
      category,
      setFilterParams,
      filterParams,
      setIsCategoryListOpen,
      linkPath: buildMediaListChipPath('browse', 'episodes'),
      router,
    });
  };

  const handleOnClickAllCategories = () => {
    onClickAllCategories({ filterParams, setFilterParams, setIsCategoryListOpen });
  };

  if (isCategoryListOpen) {
    return (
      <CategoriesList
        onAllCategoriesClick={handleOnClickAllCategories}
        onCategoryClick={handleOnClickCategory}
        selectedCategory={filterParams.category}
      />
    );
  }

  const showEmpty = shouldShowBrowseEmptyMessage({
    isBrowse: scope === 'browse',
    isLoading,
    page,
    rowCount: items.length,
  });

  return (
    <>
      {/* Wait until the Add by RSS read settles so a feed-only list does not flash this. */}
      {type === 'subscribed' && addByRSS.isReady && (
        <HowToStartInfo rows={entries ?? items} totalPages={totalPages} />
      )}
      {showEmpty ? (
        <NoResults message={tMedia('podcast.no_episodes_found')} />
      ) : (
        <CoreEpisodes
          page={page}
          setPage={(nextPage) => setFilterParams({ ...filterParams, page: nextPage })}
          channel={null}
          items={items}
          totalPages={totalPages}
          showSubscribeMessage={showSubscribeMessage}
          viewSelected={viewSelected}
          showChannelInfo
          entries={entries}
        />
      )}
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
