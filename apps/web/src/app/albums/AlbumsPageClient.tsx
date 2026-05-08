'use client';

import type { DTOChannel } from '@podverse/helpers';
import type { QueryParamsGetManyMusic } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

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
        <MainSidebarLayout>
          <MainColumnStack>
            <AlbumsPageList />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </AlbumsPageContextProvider>
  );
}
