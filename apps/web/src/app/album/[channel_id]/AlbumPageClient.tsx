import type { DTOChannel, DTOItem, RemoteItemsResponse } from '@podverse/helpers';
import type { QueryParamsChannelMusicAlbum } from '@podverse/helpers-requests';

import { CoreAlbumHeader } from '../../../components/Core/Artist/Album/CoreAlbumHeader';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { getBoostEligibilityForContent } from '../../../utils/value/boostEligibility';
import { AlbumPageContextProvider } from './AlbumPageContext';
import { AlbumPageList } from './AlbumPageList';
import { AlbumPageListHeader } from './AlbumPageListHeader';
import { AlbumPageSideContent } from './AlbumPageSideContent';

interface AlbumPageClientProps {
  initialQueryParams: QueryParamsChannelMusicAlbum;
  ssrChannel: DTOChannel;
  ssrItemsWithLiveItem: DTOItem[];
  ssrItems: DTOItem[];
  ssrTotalPages: number;
  ssrPodroll: RemoteItemsResponse | null;
}

export function AlbumPageClient(props: AlbumPageClientProps) {
  const {
    initialQueryParams,
    ssrChannel,
    ssrItemsWithLiveItem,
    ssrItems,
    ssrTotalPages,
    ssrPodroll,
  } = props;
  const { canShowBoostMessagesTab: ssrCanShowBoosts } = getBoostEligibilityForContent({
    channel: ssrChannel,
    item: null,
  });

  return (
    <AlbumPageContextProvider
      initialQueryParams={initialQueryParams}
      ssrItemsWithLiveItem={ssrItemsWithLiveItem}
      ssrItems={ssrItems}
      ssrTotalPages={ssrTotalPages}
    >
      <MainWrapper>
        <CoreAlbumHeader channel={ssrChannel} />
        <MainInnerWrapper>
          <AlbumPageSideContent channel={ssrChannel} podroll={ssrPodroll} />
          <MainInnerContentWrapper>
            <AlbumPageListHeader ssrHasPodroll={!!ssrPodroll} ssrCanShowBoosts={ssrCanShowBoosts} />
            <AlbumPageList
              ssrChannel={ssrChannel}
              podroll={ssrPodroll}
              ssrCanShowBoosts={ssrCanShowBoosts}
            />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </AlbumPageContextProvider>
  );
}
