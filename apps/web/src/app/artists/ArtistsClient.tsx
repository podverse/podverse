'use client';

import { DTOChannel } from '@podverse/helpers';
import { QueryParamsGetManyMusic } from '@podverse/helpers-requests';
import { ArtistsContextProvider } from './ArtistsContext';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { ArtistsHeader } from './ArtistsHeader';
import { ArtistsList } from './ArtistsList';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';

interface ArtistsClientProps {
  initialQueryParams: QueryParamsGetManyMusic;
  ssrChannels: DTOChannel[];
  ssrTotalPages: number;
}

export function ArtistsClient(props: ArtistsClientProps) {
  const { initialQueryParams, ssrChannels, ssrTotalPages } = props;

  return (
    <ArtistsContextProvider
      initialQueryParams={initialQueryParams}
      ssrChannels={ssrChannels}
      ssrTotalPages={ssrTotalPages}
    >
      <ArtistsHeader />
      <MainWrapper>
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <ArtistsList />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </ArtistsContextProvider>
  );
}
