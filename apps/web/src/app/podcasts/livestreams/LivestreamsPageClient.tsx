'use client';

import type { DTOItem } from '@podverse/helpers';
import type { QueryParamsGetManyLivestreams } from '@podverse/helpers-requests';
import { LivestreamsPageContextProvider } from './LivestreamsPageContext';
import { LivestreamsPageHeader } from './LivestreamsPageHeader';
import { LivestreamsPageList } from './LivestreamsPageList';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';

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
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <LivestreamsPageList medium={medium} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </LivestreamsPageContextProvider>
  );
}
