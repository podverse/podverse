import { useRouter } from 'next/navigation';
import React from 'react';

import type { DTOCategory } from '@podverse/helpers';

import { CorePodcasts } from '../../components/Core/Podcast/CorePodcasts';
import { HowToStartInfo } from '../../components/HowToStartInfo/HowToStartInfo';
import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { ModalCategoriesSelect } from '../../components/Modal/ModalCategoriesSelect';
import { ROUTES } from '../../constants/routes';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { onClickCategory } from '../../utils/categories';
import { usePodcastsPageContext } from './PodcastsPageContext';

export const PodcastsPageList: React.FC = () => {
  const {
    filterParams,
    setFilterParams,
    channels,
    totalPages,
    isLoading,
    showSubscribeMessage,
    showCategoriesModal,
    setShowCategoriesModal,
  } = usePodcastsPageContext();
  const { viewSelected } = useLocalSettings();
  const { page, type, category } = filterParams;
  const router = useRouter();

  const handleOnClickCategory = (category: DTOCategory) => {
    onClickCategory({
      category,
      setFilterParams,
      filterParams,
      setShowCategoriesModal,
      linkPath: ROUTES.PODCASTS,
      router,
    });
  };

  return (
    <>
      {filterParams.type === 'subscribed' && (
        <HowToStartInfo rows={channels} totalPages={totalPages} />
      )}
      <CorePodcasts
        page={page}
        setPage={(page) => setFilterParams({ ...filterParams, page })}
        channels={channels}
        totalPages={totalPages}
        showSubscribeMessage={showSubscribeMessage}
        type={type}
        category={category}
        viewSelected={viewSelected}
      />
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
      <ModalCategoriesSelect
        isOpen={showCategoriesModal}
        onCategoryClick={handleOnClickCategory}
        setIsOpen={setShowCategoriesModal}
      />
    </>
  );
};
