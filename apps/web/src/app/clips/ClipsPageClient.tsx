'use client';

import type { DTOClip } from '@podverse/helpers';
import type { QueryParamsGetManyPartial } from '@podverse/helpers-requests';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
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
        <MainSidebarLayout>
          <MainColumnStack>
            <ClipsPageList />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </ClipsPageContextProvider>
  );
}
