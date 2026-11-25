'use client';

import type { DTOQueue } from '@podverse/helpers';
import type { QueryParamsHistory } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { HistoryPageContextProvider } from './HistoryPageContext';
import { HistoryPageHeader } from './HistoryPageHeader';
import { HistoryPageList } from './HistoryPageList';
import { HistoryPageListHeader } from './HistoryPageListHeader';

interface HistoryPageClientProps {
  initialQueryParams: QueryParamsHistory;
  mediumTabsVisible: boolean;
  ssrQueues: DTOQueue[];
}

export function HistoryPageClient(props: HistoryPageClientProps) {
  const { initialQueryParams, mediumTabsVisible, ssrQueues } = props;

  return (
    <HistoryPageContextProvider
      initialQueryParams={initialQueryParams}
      mediumTabsVisible={mediumTabsVisible}
      ssrQueues={ssrQueues}
    >
      <HistoryPageHeader />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <HistoryPageListHeader />
            <HistoryPageList />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </HistoryPageContextProvider>
  );
}
