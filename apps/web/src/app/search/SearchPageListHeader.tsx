'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { ButtonTabs, SearchInput } from '@podverse/ui';

import { useConfig } from '../../contexts/Config';
import {
  checkBackNavFlag,
  clearBackNavFlag,
  hasLeftInitialDocument,
} from '../../contexts/Navigation';
import type { SearchInputArrival } from './searchInputFocus';
import { readSearchInputArrival, shouldFocusSearchInput } from './searchInputFocus';
import { useSearchPageContext } from './SearchPageContext';

import styles from './SearchPageListHeader.module.scss';

const searchInputElement = (): HTMLInputElement | null => {
  const input = document.getElementById('search-input');
  return input instanceof HTMLInputElement ? input : null;
};

export function SearchPageListHeader() {
  const { searchParams, setSearchParams } = useSearchPageContext();
  const musicEnabled = useConfig().public.catalog.musicEnabled;
  const tFeatures = useTranslations('features');
  const tFilters = useTranslations('filters');
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const arrivalRef = useRef<SearchInputArrival | null>(null);
  if (arrivalRef.current === null && typeof window !== 'undefined') {
    arrivalRef.current = readSearchInputArrival(checkBackNavFlag(), hasLeftInitialDocument());
  }

  useLayoutEffect(() => {
    const arrival = arrivalRef.current;
    const input = searchInputElement();
    if (arrival === null || input === null) {
      return;
    }
    if (arrival.backNavFlag) {
      clearBackNavFlag();
    }
    if (!shouldFocusSearchInput(arrival)) {
      input.blur();
      return;
    }
    input.focus();
  }, []);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        return;
      }
      searchInputElement()?.blur();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

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
        clearButtonAriaLabel={tMisc('clear_search')}
        id="search-input"
        onSearch={handleSearch}
        placeholder={tFeatures('search.search_by_title')}
      />
      {musicEnabled ? (
        <ButtonTabs
          buttonTabs={mediumTabs}
          className={styles.mediumChips}
          selectedKey={searchParams.medium}
        />
      ) : null}
    </div>
  );
}
