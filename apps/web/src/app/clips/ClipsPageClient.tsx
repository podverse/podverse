'use client';

import type { DTOClip } from '@podverse/helpers';
import type { QueryParamsGetManyPartial } from '@podverse/helpers-requests';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { ClipsPageContextProvider } from './ClipsPageContext';
import { ClipsPageHeader } from './ClipsPageHeader';
import { ClipsPageList } from './ClipsPageList';

interface ClipsPageClientProps {
  initialQueryParams: QueryParamsGetManyPartial;
  ssrClips: DTOClip[];
  ssrTotalPages: number;
}

export function ClipsPageClient(props: ClipsPageClientProps) {
  const { initialQueryParams, ssrClips, ssrTotalPages } = props;

  return (
    <ClipsPageContextProvider
      initialQueryParams={initialQueryParams}
      ssrClips={ssrClips}
      ssrTotalPages={ssrTotalPages}
    >
      <ClipsPageHeader />
      <MainWrapper>
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <ClipsPageList />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </ClipsPageContextProvider>
  );
}
