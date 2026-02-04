'use client';

import type { DTOQueue } from '@podverse/helpers';
import type { QueryParamsQueues } from '@podverse/helpers-requests';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { QueuesPageContextProvider } from './QueuesPageContext';
import { QueuesPageHeader } from './QueuesPageHeader';
import { QueuesPageList } from './QueuesPageList';
import { QueuesPageListHeader } from './QueuesPageListHeader';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { SideContent } from '../../components/SideContent/SideContent';

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
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <QueuesPageListHeader />
            <QueuesPageList />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </QueuesPageContextProvider>
  );
}
