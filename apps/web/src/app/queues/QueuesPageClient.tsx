'use client';

import type { DTOQueue } from '@podverse/helpers';
import type { QueryParamsQueues } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout, SideContent } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { QueuesPageContextProvider } from './QueuesPageContext';
import { QueuesPageHeader } from './QueuesPageHeader';
import { QueuesPageList } from './QueuesPageList';
import { QueuesPageListHeader } from './QueuesPageListHeader';

interface QueuesPageClientProps {
  initialQueryParams: QueryParamsQueues;
  ssrQueues: DTOQueue[];
}

export function QueuesPageClient(props: QueuesPageClientProps) {
  const { initialQueryParams, ssrQueues } = props;

  return (
    <QueuesPageContextProvider initialQueryParams={initialQueryParams} ssrQueues={ssrQueues}>
      <QueuesPageHeader />
      <MainWrapper>
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            <QueuesPageListHeader />
            <QueuesPageList />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </QueuesPageContextProvider>
  );
}
