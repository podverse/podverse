'use client';

import type { DTOQueue } from '@podverse/helpers';
import type { QueryParamsQueues } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { QueuesPageContextProvider } from './QueuesPageContext';
import { QueuesPageHeader } from './QueuesPageHeader';
import { QueuesPageList } from './QueuesPageList';
import { QueuesPageListHeader } from './QueuesPageListHeader';

interface QueuesPageClientProps {
  initialQueryParams: QueryParamsQueues;
  mediumTabsVisible: boolean;
  ssrQueues: DTOQueue[];
}

export function QueuesPageClient(props: QueuesPageClientProps) {
  const { initialQueryParams, mediumTabsVisible, ssrQueues } = props;

  return (
    <QueuesPageContextProvider
      initialQueryParams={initialQueryParams}
      mediumTabsVisible={mediumTabsVisible}
      ssrQueues={ssrQueues}
    >
      <QueuesPageHeader />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <QueuesPageListHeader />
            <QueuesPageList />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </QueuesPageContextProvider>
  );
}
