'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOCategory } from '@podverse/helpers';

import { CategoriesList } from '../Category/CategoriesList';
import { Modal, MODAL_CONTENT_MAX_WIDTH } from './Modal';

type ModalCategoriesSelectProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onCategoryClick: (category: DTOCategory) => void;
};

export const ModalCategoriesSelect: React.FC<ModalCategoriesSelectProps> = ({
  isOpen,
  setIsOpen,
  onCategoryClick,
}) => {
  const tCategories = useTranslations('categories');

  const clearModalCategoriesSelect = () => {
    setIsOpen(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={clearModalCategoriesSelect}
      header={tCategories('categories')}
      ariaLabel={tCategories('categories')}
      modalContentMaxWidth={MODAL_CONTENT_MAX_WIDTH}
    >
      <CategoriesList onCategoryClick={onCategoryClick} />
    </Modal>
  );
};
