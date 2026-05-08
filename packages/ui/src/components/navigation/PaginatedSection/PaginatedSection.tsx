'use client';

import classNames from 'classnames';
import type { ReactNode } from 'react';

import { PaginationStrip } from '../PaginationStrip/PaginationStrip';

import styles from './PaginatedSection.module.scss';

export const PAGINATION_STRIP_DEFAULT_MAX_BUTTONS = 5;

export type PaginatedSectionProps = {
  children: ReactNode;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  prevAriaLabel: string;
  nextAriaLabel: string;
  maxButtons?: number;
  paginationControlsClassName?: string;
  className?: string;
};

export function PaginatedSection({
  children,
  className,
  currentPage,
  maxButtons = PAGINATION_STRIP_DEFAULT_MAX_BUTTONS,
  nextAriaLabel,
  onPageChange,
  paginationControlsClassName,
  prevAriaLabel,
  totalPages,
}: PaginatedSectionProps) {
  const showPaginationControls = totalPages > 1;

  return (
    <div className={classNames(styles.root, className)}>
      {children}
      {showPaginationControls ? (
        <PaginationStrip
          currentPage={currentPage}
          maxButtons={maxButtons}
          nextAriaLabel={nextAriaLabel}
          onPageChange={onPageChange}
          paginationControlsClassName={paginationControlsClassName}
          prevAriaLabel={prevAriaLabel}
          totalPages={totalPages}
        />
      ) : null}
    </div>
  );
}
