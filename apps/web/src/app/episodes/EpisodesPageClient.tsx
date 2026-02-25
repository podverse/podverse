'use client';

import type { DTOItem } from '@podverse/helpers';
import type { QueryParamsGetManyPartial } from '@podverse/helpers-requests';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { EpisodesPageContextProvider } from './EpisodesPageContext';
import { EpisodesPageHeader } from './EpisodesPageHeader';
import { EpisodesPageList } from './EpisodesPageList';

interface EpisodesPageClientProps {
  initialQueryParams: QueryParamsGetManyPartial;
  ssrItems: DTOItem[];
  ssrTotalPages: number;
}

export function EpisodesPageClient(props: EpisodesPageClientProps) {
  const { initialQueryParams, ssrItems, ssrTotalPages } = props;

  return (
    <EpisodesPageContextProvider
      initialQueryParams={initialQueryParams}
      ssrItems={ssrItems}
      ssrTotalPages={ssrTotalPages}
    >
      <EpisodesPageHeader />
      <MainWrapper>
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <EpisodesPageList />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </EpisodesPageContextProvider>
  );
}
