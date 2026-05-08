'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { PaginatedSection } from '@podverse/ui';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  setPage: (page: number) => void;
  children: React.ReactNode;
  maxButtons?: number;
  paginationControlsClassName?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  setPage,
  children,
  maxButtons,
  paginationControlsClassName = '',
}) => {
  const t = useTranslations('pagination');

  return (
    <PaginatedSection
      currentPage={currentPage}
      maxButtons={maxButtons}
      nextAriaLabel={t('ariaNextPage')}
      onPageChange={setPage}
      paginationControlsClassName={paginationControlsClassName}
      prevAriaLabel={t('ariaPreviousPage')}
      totalPages={totalPages}
    >
      {children}
    </PaginatedSection>
  );
};
