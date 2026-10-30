import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOCategory } from '@podverse/helpers';

import { CategoriesList } from '../../../components/Category/CategoriesList';
import { HowToStartInfo } from '../../../components/HowToStartInfo/HowToStartInfo';
import { ListClips } from '../../../components/List/Clips/ListClips';
import { WebLoadingSpinnerOverlay } from '../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { NoResults } from '../../../components/NoResults/NoResults';
import { onClickAllCategories, onClickCategory } from '../../../utils/categories';
import {
  buildMediaListChipPath,
  shouldShowBrowseEmptyMessage,
} from '../../../utils/mediaListChips';
import { useClipsPageContext } from './ClipsPageContext';

export const ClipsPageList: React.FC = () => {
  const {
    filterParams,
    setFilterParams,
    clips,
    totalPages,
    isLoading,
    showSubscribeMessage,
    isCategoryListOpen,
    setIsCategoryListOpen,
    scope,
  } = useClipsPageContext();
  const tFeatures = useTranslations('features');
  const { page, type, category } = filterParams;
  const router = useRouter();

  const handleOnClickCategory = (category: DTOCategory) => {
    onClickCategory({
      category,
      setFilterParams,
      filterParams,
      setIsCategoryListOpen,
      linkPath: buildMediaListChipPath('browse', 'clips'),
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
    rowCount: clips.length,
  });

  return (
    <>
      {filterParams.type === 'subscribed' && (
        <HowToStartInfo rows={clips} totalPages={totalPages} />
      )}
      {showEmpty ? (
        <NoResults message={tFeatures('clip.no_clips_found')} />
      ) : (
        <ListClips
          page={page}
          setPage={(page) => setFilterParams({ ...filterParams, page })}
          clips={clips}
          totalPages={totalPages}
          showSubscribeMessage={showSubscribeMessage}
          type={type}
          category={category}
          showChannelInfo
          showItemInfo
        />
      )}
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
