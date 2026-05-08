'use client';

import type { DTOItem } from '@podverse/helpers';
import type { QueryParamsGetManyPartial } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { EpisodesPageContextProvider } from './EpisodesPageContext';
import { EpisodesPageHeader } from './EpisodesPageHeader';
import { EpisodesPageList } from './EpisodesPageList';

interface EpisodesPageClientProps {
  initialQueryParams: QueryParamsGetManyPartial;
  ssrItems: DTOItem[];
  ssrTotalPages: number;
}

export function EpisodesPageClient(props: EpisodesPageClientProps) {
  const { initialQueryParams, ssrItems, ssrTotalPages } = props;

  return (
    <EpisodesPageContextProvider
      initialQueryParams={initialQueryParams}
      ssrItems={ssrItems}
      ssrTotalPages={ssrTotalPages}
    >
      <EpisodesPageHeader />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <EpisodesPageList />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </EpisodesPageContextProvider>
  );
}
