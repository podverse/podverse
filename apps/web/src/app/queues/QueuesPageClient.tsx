'use client';

import type { DTOQueue } from '@podverse/helpers';
import type { QueryParamsQueues } from '@podverse/helpers-requests';

import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { SideContent } from '../../components/SideContent/SideContent';
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
