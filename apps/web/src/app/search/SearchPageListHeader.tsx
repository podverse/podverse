'use client';

import { useTranslations } from 'next-intl';
import { SearchInput } from '../../components/Form/SearchInput';
import { useSearchPageContext } from './SearchPageContext';

export function SearchPageListHeader() {
  const { setSearchParams } = useSearchPageContext();
  const tFeatures = useTranslations('features');

  return (
    <div>
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
