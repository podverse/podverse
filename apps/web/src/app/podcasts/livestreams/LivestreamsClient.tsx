'use client';

import { DTOItem } from '@podverse/helpers';
import { QueryParamsGetManyLivestreams } from '@podverse/helpers-requests';
import { LivestreamsContextProvider } from './LivestreamsContext';
import { LivestreamsHeader } from './LivestreamsHeader';
import { LivestreamsList } from './LivestreamsList';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';

interface LivestreamsClientProps {
  initialQueryParams: QueryParamsGetManyLivestreams;
  ssrItems: DTOItem[];
  ssrTotalPages: number;
  medium: 'av' | 'music';
}

export function LivestreamsClient(props: LivestreamsClientProps) {
  const { initialQueryParams, ssrItems, ssrTotalPages, medium } = props;

  return (
    <LivestreamsContextProvider
      initialQueryParams={initialQueryParams}
      ssrItems={ssrItems}
      ssrTotalPages={ssrTotalPages}
      medium={medium}
    >
      <LivestreamsHeader medium={medium} />
      <MainWrapper>
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <LivestreamsList medium={medium} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </LivestreamsContextProvider>
  );
}
