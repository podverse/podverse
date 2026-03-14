'use client';

import type { DTOChannel } from '@podverse/helpers';
import type { QueryParamsGetManyMusic } from '@podverse/helpers-requests';

import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { AlbumsPageContextProvider } from './AlbumsPageContext';
import { AlbumsPageHeader } from './AlbumsPageHeader';
import { AlbumsPageList } from './AlbumsPageList';

interface AlbumsPageClientProps {
  initialQueryParams: QueryParamsGetManyMusic;
  ssrChannels: DTOChannel[];
  ssrTotalPages: number;
}

export function AlbumsPageClient(props: AlbumsPageClientProps) {
  const { initialQueryParams, ssrChannels, ssrTotalPages } = props;

  return (
    <AlbumsPageContextProvider
      initialQueryParams={initialQueryParams}
      ssrChannels={ssrChannels}
      ssrTotalPages={ssrTotalPages}
    >
      <AlbumsPageHeader />
      <MainWrapper>
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <AlbumsPageList />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </AlbumsPageContextProvider>
  );
}
