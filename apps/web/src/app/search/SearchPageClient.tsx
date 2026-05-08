'use client';

import { MainColumnStack, MainSidebarLayout, SideContent } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { SearchPageContextProvider } from './SearchPageContext';
import { SearchPageHeader } from './SearchPageHeader';
import { SearchPageList } from './SearchPageList';
import { SearchPageListHeader } from './SearchPageListHeader';

export function SearchPageClient() {
  return (
    <SearchPageContextProvider>
      <MainWrapper>
        <SearchPageHeader />
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            <SearchPageListHeader />
            <SearchPageList />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </SearchPageContextProvider>
  );
}
