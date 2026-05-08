'use client';

import type { DTOItem } from '@podverse/helpers';
import type { QueryParamsGetManyLivestreams } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../../components/Main/MainWrapper';
import { LivestreamsPageContextProvider } from './LivestreamsPageContext';
import { LivestreamsPageHeader } from './LivestreamsPageHeader';
import { LivestreamsPageList } from './LivestreamsPageList';

interface LivestreamsPageClientProps {
  initialQueryParams: QueryParamsGetManyLivestreams;
  ssrItems: DTOItem[];
  ssrTotalPages: number;
  medium: 'av' | 'music';
}

export function LivestreamsPageClient(props: LivestreamsPageClientProps) {
  const { initialQueryParams, ssrItems, ssrTotalPages, medium } = props;

  return (
    <LivestreamsPageContextProvider
      initialQueryParams={initialQueryParams}
      ssrItems={ssrItems}
      ssrTotalPages={ssrTotalPages}
      medium={medium}
    >
      <LivestreamsPageHeader medium={medium} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <LivestreamsPageList medium={medium} />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </LivestreamsPageContextProvider>
  );
}
