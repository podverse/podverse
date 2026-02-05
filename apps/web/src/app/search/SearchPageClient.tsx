'use client';

import { SearchPageContextProvider } from './SearchPageContext';
import { SearchPageHeader } from './SearchPageHeader';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { SearchPageListHeader } from './SearchPageListHeader';
import { SideContent } from '../../components/SideContent/SideContent';
import { SearchPageList } from './SearchPageList';

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
