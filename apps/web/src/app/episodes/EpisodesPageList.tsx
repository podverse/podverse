'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import type { DTOCategory } from '@podverse/helpers';

import { CoreEpisodes } from '../../components/Core/Podcast/Episodes/CoreEpisodes';
import { HowToStartInfo } from '../../components/InfoWrapper/HowToStartInfo';
import LoadingSpinnerOverlay from '../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { ModalCategoriesSelect } from '../../components/Modal/ModalCategoriesSelect';
import { ROUTES } from '../../constants/routes';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { onClickCategory } from '../../utils/categories';
import { useEpisodesPageContext } from './EpisodesPageContext';

export const EpisodesPageList: React.FC = () => {
  const {
    filterParams,
    setFilterParams,
    items,
    totalPages,
    isLoading,
    showSubscribeMessage,
    showCategoriesModal,
    setShowCategoriesModal,
  } = useEpisodesPageContext();
  const { viewSelected } = useLocalSettings();
  const { page, type } = filterParams;
  const router = useRouter();

  const handleOnClickCategory = (category: DTOCategory) => {
    onClickCategory({
      category,
      setFilterParams,
      filterParams,
      setShowCategoriesModal,
      linkPath: ROUTES.EPISODES,
      router,
    });
  };

  return (
    <>
      {type === 'subscribed' && <HowToStartInfo rows={items} totalPages={totalPages} />}
      <CoreEpisodes
        page={page}
        setPage={(page) => setFilterParams({ ...filterParams, page })}
        channel={null}
        items={items}
        totalPages={totalPages}
        showSubscribeMessage={showSubscribeMessage}
        viewSelected={viewSelected}
        showChannelInfo
      />
      <LoadingSpinnerOverlay isLoading={isLoading} />
      <ModalCategoriesSelect
        isOpen={showCategoriesModal}
        onCategoryClick={handleOnClickCategory}
        setIsOpen={setShowCategoriesModal}
      />
    </>
  );
};
