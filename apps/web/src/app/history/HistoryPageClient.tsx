'use client';

import type { DTOQueue } from '@podverse/helpers';
import type { QueryParamsHistory } from '@podverse/helpers-requests';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { HistoryPageContextProvider } from './HistoryPageContext';
import { HistoryPageHeader } from './HistoryPageHeader';
import { HistoryPageList } from './HistoryPageList';
import { HistoryPageListHeader } from './HistoryPageListHeader';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { SideContent } from '../../components/SideContent/SideContent';

interface HistoryPageClientProps {
  initialQueryParams: QueryParamsHistory;
  ssrQueues: DTOQueue[];
}

export function HistoryPageClient(props: HistoryPageClientProps) {
  const { initialQueryParams, ssrQueues } = props;

  return (
    <HistoryPageContextProvider initialQueryParams={initialQueryParams} ssrQueues={ssrQueues}>
      <HistoryPageHeader />
      <MainWrapper>
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <HistoryPageListHeader />
            <HistoryPageList />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </HistoryPageContextProvider>
  );
}
