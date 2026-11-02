'use client';

import type { QueryParamsPodcastIndexSearchMedium } from '@podverse/helpers';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { SearchPageContextProvider } from './SearchPageContext';
import { SearchPageHeader } from './SearchPageHeader';
import { SearchPageList } from './SearchPageList';
import { SearchPageListHeader } from './SearchPageListHeader';

type SearchPageClientProps = {
  initialMedium: QueryParamsPodcastIndexSearchMedium;
};

export function SearchPageClient({ initialMedium }: SearchPageClientProps) {
  return (
    <SearchPageContextProvider initialMedium={initialMedium}>
      <MainWrapper>
        <SearchPageHeader />
        <MainSidebarLayout>
          <MainColumnStack>
            <SearchPageListHeader />
            <SearchPageList />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </SearchPageContextProvider>
  );
}
