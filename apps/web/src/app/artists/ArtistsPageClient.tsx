'use client';

import type { DTOChannel } from '@podverse/helpers';
import type { QueryParamsGetManyMusic } from '@podverse/helpers-requests';
import { ArtistsPageContextProvider } from './ArtistsPageContext';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { ArtistsPageHeader } from './ArtistsPageHeader';
import { ArtistsPageList } from './ArtistsPageList';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';

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
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <ArtistsPageList />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </ArtistsPageContextProvider>
  );
}
