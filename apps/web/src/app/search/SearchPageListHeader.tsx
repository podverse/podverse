'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { ButtonTabs, SearchInput } from '@podverse/ui';

import { useSearchPageContext } from './SearchPageContext';

import styles from './SearchPageListHeader.module.scss';

export function SearchPageListHeader() {
  const { searchParams, setSearchParams } = useSearchPageContext();
  const tFeatures = useTranslations('features');
  const tFilters = useTranslations('filters');
  const tMedia = useTranslations('media');

  const handleSearch = useCallback(
    (value: string) => {
      setSearchParams({ medium: searchParams.medium, q: value });
    },
    [searchParams.medium, setSearchParams]
  );

  const mediumTabs = [
    {
      key: 'all',
      label: tFilters('type.all'),
      onClick: () => setSearchParams({ medium: 'all', q: searchParams.q }),
    },
    {
      key: 'music',
      label: tMedia('music.music'),
      onClick: () => setSearchParams({ medium: 'music', q: searchParams.q }),
    },
  ];

  return (
    <div className={styles.searchHeader}>
      <SearchInput
        aria-label={tFeatures('search.search_by_title')}
        autoFocus
        id="search-input"
        onSearch={handleSearch}
        placeholder={tFeatures('search.search_by_title')}
      />
      <ButtonTabs
        buttonTabs={mediumTabs}
        className={styles.mediumChips}
        selectedKey={searchParams.medium}
      />
    </div>
  );
}
