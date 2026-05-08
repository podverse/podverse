'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOCategory } from '@podverse/helpers';
import { Modal } from '@podverse/ui';

import { CategoriesList } from '../Category/CategoriesList';

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
  const tMisc = useTranslations('misc');

  const clearModalCategoriesSelect = () => {
    setIsOpen(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={clearModalCategoriesSelect}
      closeButtonAriaLabel={tMisc('close_modal')}
      header={tCategories('categories')}
      ariaLabel={tCategories('categories')}
    >
      <CategoriesList onCategoryClick={onCategoryClick} />
    </Modal>
  );
};
