import type { DTOChannel } from '@podverse/helpers';
import type { QueryParamsHome } from '@podverse/helpers-requests';

import { MainInnerContentWrapper } from '../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../components/Main/MainInnerWrapper';
import { MainWrapper } from '../components/Main/MainWrapper';
import { HomePageContextProvider } from './HomePageContext';
import { HomePageHeader } from './HomePageHeader';
import { HomePageList } from './HomePageList';

type HomePageClientProps = {
  initialQueryParams: QueryParamsHome;
  ssrChannels: DTOChannel[];
  isValidAuthSession: boolean;
  ssrTotalPages: number;
};

export function HomePageClient({
  initialQueryParams,
  ssrChannels,
  ssrTotalPages,
}: HomePageClientProps) {
  return (
    <HomePageContextProvider
      initialQueryParams={initialQueryParams}
      ssrChannels={ssrChannels}
      ssrTotalPages={ssrTotalPages}
    >
      <HomePageHeader />
      <MainWrapper>
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <HomePageList />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </HomePageContextProvider>
  );
}
