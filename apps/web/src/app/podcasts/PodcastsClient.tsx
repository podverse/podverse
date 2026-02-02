'use client';

import type { DTOChannel } from '@podverse/helpers';
import type { QueryParamsGetMany } from '@podverse/helpers-requests';
import { PodcastsContextProvider } from './PodcastsContext';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { PodcastsHeader } from './PodcastsHeader';
import { PodcastsList } from './PodcastsList';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';

interface PodcastsClientProps {
  initialQueryParams: QueryParamsGetMany;
  ssrChannels: DTOChannel[];
  ssrTotalPages: number;
}

export function PodcastsClient(props: PodcastsClientProps) {
  const { initialQueryParams, ssrChannels, ssrTotalPages } = props;

  return (
    <PodcastsContextProvider
      initialQueryParams={initialQueryParams}
      ssrChannels={ssrChannels}
      ssrTotalPages={ssrTotalPages}
    >
      <PodcastsHeader />
      <MainWrapper>
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <PodcastsList />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </PodcastsContextProvider>
  );
}
