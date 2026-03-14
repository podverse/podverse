'use client';

import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { SideContent } from '../../components/SideContent/SideContent';
import { SearchPageContextProvider } from './SearchPageContext';
import { SearchPageHeader } from './SearchPageHeader';
import { SearchPageList } from './SearchPageList';
import { SearchPageListHeader } from './SearchPageListHeader';

export function SearchPageClient() {
  return (
    <SearchPageContextProvider>
      <MainWrapper>
        <SearchPageHeader />
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <SearchPageListHeader />
            <SearchPageList />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </SearchPageContextProvider>
  );
}
