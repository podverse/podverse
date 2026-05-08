'use client';

import { useTranslations } from 'next-intl';

import { SearchInput } from '@podverse/ui';

import { useSearchPageContext } from './SearchPageContext';

import styles from './SearchPageListHeader.module.scss';

export function SearchPageListHeader() {
  const { setSearchParams } = useSearchPageContext();
  const tFeatures = useTranslations('features');

  return (
    <div className={styles.searchInputWrapper}>
      <SearchInput
        onSearch={(value: string) => {
          setSearchParams({ q: value });
        }}
        placeholder={tFeatures('search.search_by_title')}
        autoFocus
      />
    </div>
  );
}
