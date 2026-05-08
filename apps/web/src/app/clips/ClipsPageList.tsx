import { useRouter } from 'next/navigation';
import React from 'react';

import type { DTOCategory } from '@podverse/helpers';

import { HowToStartInfo } from '../../components/HowToStartInfo/HowToStartInfo';
import { ListClips } from '../../components/List/Clips/ListClips';
import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { ModalCategoriesSelect } from '../../components/Modal/ModalCategoriesSelect';
import { ROUTES } from '../../constants/routes';
import { onClickCategory } from '../../utils/categories';
import { useClipsPageContext } from './ClipsPageContext';

export const ClipsPageList: React.FC = () => {
  const {
    filterParams,
    setFilterParams,
    clips,
    totalPages,
    isLoading,
    showSubscribeMessage,
    showCategoriesModal,
    setShowCategoriesModal,
  } = useClipsPageContext();
  const { page, type, category } = filterParams;
  const router = useRouter();

  const handleOnClickCategory = (category: DTOCategory) => {
    onClickCategory({
      category,
      setFilterParams,
      filterParams,
      setShowCategoriesModal,
      linkPath: ROUTES.CLIPS,
      router,
    });
  };

  return (
    <>
      {filterParams.type === 'subscribed' && (
        <HowToStartInfo rows={clips} totalPages={totalPages} />
      )}
      <ListClips
        page={page}
        setPage={(page) => setFilterParams({ ...filterParams, page })}
        clips={clips}
        totalPages={totalPages}
        showSubscribeMessage={showSubscribeMessage}
        type={type}
        category={category}
        showItemInfo
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
