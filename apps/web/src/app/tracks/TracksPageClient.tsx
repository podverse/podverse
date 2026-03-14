'use client';

import type { DTOItem } from '@podverse/helpers';
import type { QueryParamsGetManyPartialMusic } from '@podverse/helpers-requests';

import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { TracksPageContextProvider } from './TracksPageContext';
import { TracksPageHeader } from './TracksPageHeader';
import { TracksPageList } from './TracksPageList';

interface TracksPageClientProps {
  initialQueryParams: QueryParamsGetManyPartialMusic;
  ssrItems: DTOItem[];
  ssrTotalPages: number;
}

export function TracksPageClient(props: TracksPageClientProps) {
  const { initialQueryParams, ssrItems, ssrTotalPages } = props;

  return (
    <TracksPageContextProvider
      initialQueryParams={initialQueryParams}
      ssrItems={ssrItems}
      ssrTotalPages={ssrTotalPages}
    >
      <TracksPageHeader />
      <MainWrapper>
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <TracksPageList />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </TracksPageContextProvider>
  );
}
