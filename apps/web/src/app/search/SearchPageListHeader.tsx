'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { SearchInput } from '@podverse/ui';

import { useSearchPageContext } from './SearchPageContext';

import styles from './SearchPageListHeader.module.scss';

export function SearchPageListHeader() {
  const { setSearchParams } = useSearchPageContext();
  const tFeatures = useTranslations('features');

  const handleSearch = useCallback(
    (value: string) => {
      setSearchParams({ q: value });
    },
    [setSearchParams]
  );

  return (
    <div className={styles.searchInputWrapper}>
      <SearchInput
        onSearch={handleSearch}
        placeholder={tFeatures('search.search_by_title')}
        autoFocus
      />
    </div>
  );
}
