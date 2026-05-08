'use client';

import type { DTOChannel } from '@podverse/helpers';
import type { QueryParamsGetManyMusic } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { ArtistsPageContextProvider } from './ArtistsPageContext';
import { ArtistsPageHeader } from './ArtistsPageHeader';
import { ArtistsPageList } from './ArtistsPageList';

interface ArtistsPageClientProps {
  initialQueryParams: QueryParamsGetManyMusic;
  ssrChannels: DTOChannel[];
  ssrTotalPages: number;
}

export function ArtistsPageClient(props: ArtistsPageClientProps) {
  const { initialQueryParams, ssrChannels, ssrTotalPages } = props;

  return (
    <ArtistsPageContextProvider
      initialQueryParams={initialQueryParams}
      ssrChannels={ssrChannels}
      ssrTotalPages={ssrTotalPages}
    >
      <ArtistsPageHeader />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <ArtistsPageList />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </ArtistsPageContextProvider>
  );
}
