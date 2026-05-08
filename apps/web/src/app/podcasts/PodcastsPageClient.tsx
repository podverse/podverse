'use client';

import type { DTOChannel } from '@podverse/helpers';
import type { QueryParamsGetMany } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { PodcastsPageContextProvider } from './PodcastsPageContext';
import { PodcastsPageHeader } from './PodcastsPageHeader';
import { PodcastsPageList } from './PodcastsPageList';

interface PodcastsPageClientProps {
  initialQueryParams: QueryParamsGetMany;
  ssrChannels: DTOChannel[];
  ssrTotalPages: number;
}

export function PodcastsPageClient(props: PodcastsPageClientProps) {
  const { initialQueryParams, ssrChannels, ssrTotalPages } = props;

  return (
    <PodcastsPageContextProvider
      initialQueryParams={initialQueryParams}
      ssrChannels={ssrChannels}
      ssrTotalPages={ssrTotalPages}
    >
      <PodcastsPageHeader />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <PodcastsPageList />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </PodcastsPageContextProvider>
  );
}
